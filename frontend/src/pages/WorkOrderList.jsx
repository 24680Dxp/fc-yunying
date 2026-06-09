import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, message,
} from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  getWorkOrders, createWorkOrder, uploadWorkOrders, exportWorkOrders,
} from '../api';
import ResizableTitle from '../components/ResizableTitle';
import 'react-resizable/css/styles.css';

const { TextArea } = Input;

const statusLabels = {
  开通中: '开通中', 已归档: '已归档',
};
const statusColors = {
  开通中: 'processing', 已归档: 'default',
};

// 广东省21个地级市
const guangdongCities = [
  '广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆',
  '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远',
  '东莞', '中山', '潮州', '揭阳', '云浮',
];

// 14 个业务字段的列定义
const baseColumns = [
  { title: '站点编号', dataIndex: 'site_code', width: 100, resizable: true },
  { title: 'CRM订单号', dataIndex: 'crm_order_id', width: 140, ellipsis: true, resizable: true },
  { title: '工单号', dataIndex: 'order_no', width: 160, ellipsis: true, resizable: true },
  {
    title: '工单状态', dataIndex: 'status', width: 90, resizable: true,
    render: (v) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag>,
  },
  {
    title: '工单主题', dataIndex: 'title', ellipsis: true, minWidth: 160, resizable: true,
    render: (v) => v ? `***${v.slice(15)}` : '',
  },
  { title: '派单时间', dataIndex: 'dispatch_time', width: 140, resizable: true },
  { title: '业务受理地市', dataIndex: 'business_city', width: 110, resizable: true },
  { title: '产品分类', dataIndex: 'product_category', width: 130, resizable: true },
  { title: '操作类型', dataIndex: 'operation_type', width: 100, resizable: true },
  { title: '集团产品号码', dataIndex: 'group_product_number', width: 130, ellipsis: true, resizable: true },
  { title: '业务所属地市', dataIndex: 'business_location_city', width: 110, resizable: true },
  { title: '客户机房详细地址', dataIndex: 'customer_address', ellipsis: true, minWidth: 140, resizable: true },
  { title: '当前环节名称', dataIndex: 'current_step', width: 120, resizable: true },
  { title: '摄像头安装位置', dataIndex: 'camera_install_location', ellipsis: true, minWidth: 120, resizable: true },
  { title: '产品实例编号', dataIndex: 'product_instance_id', ellipsis: true, minWidth: 120, resizable: true },
];

export default function WorkOrderList({ isAdmin, operationType, pageTitle }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [cityFilter, setCityFilter] = useState(undefined);
  const [categoryFilter, setCategoryFilter] = useState(undefined);
  const [form] = Form.useForm();

  // 可拖拽列宽（持久化到 localStorage）
  const STORAGE_KEY = `fc_wo_col_widths_${operationType}`;
  const [colWidths, setColWidths] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  });

  // 持久化宽度变化
  const persistWidths = useCallback((updater) => {
    setColWidths((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search || undefined,
        operation_type: operationType,
        status: statusFilter || undefined,
        business_location_city: cityFilter || undefined,
        product_category_group: categoryFilter || undefined,
      };
      const res = await getWorkOrders(params);
      setData(res.data.items);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    }
    setLoading(false);
  }, [page, statusFilter, search, operationType, pageSize, cityFilter, categoryFilter]);

  // 切换子页面时重置页码
  useEffect(() => {
    setPage(1);
    setSearch('');
    setStatusFilter(undefined);
    setCityFilter(undefined);
    setCategoryFilter(undefined);
  }, [operationType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

  const handleResize = useCallback((index) => (e, { size }) => {
    persistWidths((prev) => ({ ...prev, [index]: size.width }));
  }, [persistWidths]);

  // 给 columns 注入可拖拽属性和当前宽度
  const columns = baseColumns.map((col, index) => ({
    ...col,
    width: colWidths[index] || col.width,
    onHeaderCell: () => ({
      width: colWidths[index] || col.width,
      onResize: handleResize(index),
    }),
  }));

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadWorkOrders(file);
      message.success(res.data.message);
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail || '上传失败';
      message.error(detail);
    }
    e.target.value = '';
  };

  const handleExport = async () => {
    try {
      const params = {
        search: search || undefined,
        status: statusFilter || undefined,
        operation_type: operationType,
        business_location_city: cityFilter || undefined,
        product_category_group: categoryFilter || undefined,
      };
      const res = await exportWorkOrders(params);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8-sig' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `work_orders_${operationType}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ priority: 'medium', operation_type: operationType });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        message.success('更新成功');
      } else {
        await createWorkOrder(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '16px 0 16px 0' }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索工单号/主题/CRM订单号/站点编号"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 280 }}
          />
          <Select
            placeholder="工单状态"
            allowClear
            style={{ width: 120 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={Object.entries(statusLabels).map(([k, v]) => ({ label: v, value: k }))}
          />
          <Select
            placeholder="业务所属地市"
            allowClear
            style={{ width: 140 }}
            value={cityFilter}
            onChange={(v) => { setCityFilter(v); setPage(1); }}
            options={guangdongCities.map(c => ({ label: c, value: c }))}
          />
          <Select
            placeholder="产品分类"
            allowClear
            style={{ width: 150 }}
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPage(1); }}
            options={[
              { label: '互联网专线', value: '互联网专线' },
              { label: '千里眼', value: '千里眼' },
            ]}
          />
        </Space>
        <Space>
          {isAdmin && (
            <>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出清单
              </Button>
              <Button type="primary" icon={<UploadOutlined />} onClick={() => document.getElementById('excel-upload').click()}>
                上传清单
              </Button>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleUpload}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增工单
              </Button>
            </>
          )}
        </Space>
      </Space>
      </div>

      <Table
        rowKey="id"
        components={components}
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 'max-content' }}
        sticky={{ getContainer: () => document.getElementById('content-scroll'), offsetHeader: 80 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: setPage,
        }}
      />

      <Modal
        title={editing ? '编辑工单' : '新增工单'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={900}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Form.Item name="crm_order_id" label="CRM订单号">
            <Input />
          </Form.Item>
          <Form.Item name="order_no" label="工单号">
            <Input />
          </Form.Item>
          <Form.Item name="title" label="工单主题" rules={[{ required: true }]}
            style={{ gridColumn: '1 / -1' }}>
            <Input />
          </Form.Item>
          <Form.Item name="dispatch_time" label="派单时间">
            <Input placeholder="如: 2026-06-01 09:00" />
          </Form.Item>
          <Form.Item name="business_city" label="业务受理地市">
            <Input />
          </Form.Item>
          <Form.Item name="product_category" label="产品分类">
            <Select
              options={[
                { label: '视频监控', value: '视频监控' },
                { label: '网络设备', value: '网络设备' },
                { label: '服务器', value: '服务器' },
              ]}
            />
          </Form.Item>
          <Form.Item name="operation_type" label="操作类型">
            <Select
              options={[
                { label: '业务开通', value: '业务开通' },
                { label: '业务调整', value: '业务调整' },
                { label: '业务取消', value: '业务取消' },
              ]}
            />
          </Form.Item>
          <Form.Item name="group_product_number" label="集团产品号码">
            <Input />
          </Form.Item>
          <Form.Item name="business_location_city" label="业务所属地市">
            <Input />
          </Form.Item>
          <Form.Item name="customer_address" label="客户机房详细地址"
            style={{ gridColumn: '1 / -1' }}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="status" label="工单状态" initialValue="pending_assign">
            <Select
              options={Object.entries(statusLabels).map(([k, v]) => ({ label: v, value: k }))}
            />
          </Form.Item>
          <Form.Item name="current_step" label="当前环节名称">
            <Input />
          </Form.Item>
          <Form.Item name="camera_install_location" label="摄像头安装位置"
            style={{ gridColumn: '1 / -1' }}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="product_instance_id" label="产品实例编号">
            <Input />
          </Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select
              options={[
                { label: '低', value: 'low' },
                { label: '中', value: 'medium' },
                { label: '高', value: 'high' },
                { label: '紧急', value: 'urgent' },
              ]}
            />
          </Form.Item>
          <Form.Item name="assignee" label="指派人">
            <Input />
          </Form.Item>
          <Form.Item name="reporter" label="报告人">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
