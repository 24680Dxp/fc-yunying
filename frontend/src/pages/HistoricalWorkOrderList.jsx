import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UploadOutlined, DownloadOutlined,
} from '@ant-design/icons';
import {
  getHistoricalWorkOrders,
  createHistoricalWorkOrder,
  updateHistoricalWorkOrder,
  deleteHistoricalWorkOrder,
  uploadHistoricalWorkOrders,
  exportHistoricalWorkOrders,
  getHistoricalWorkOrderCities,
} from '../api';
import ResizableTitle from '../components/ResizableTitle';
import 'react-resizable/css/styles.css';

const { TextArea } = Input;

const guangdongCities = [
  '广州', '深圳', '珠海', '汕头', '佛山', '韶关', '湛江', '肇庆',
  '江门', '茂名', '惠州', '梅州', '汕尾', '河源', '阳江', '清远',
  '东莞', '中山', '潮州', '揭阳', '云浮',
];

const baseColumns = [
  { title: '站点编号', dataIndex: 'site_code', width: 110, resizable: true },
  { title: '批次', dataIndex: 'batch', width: 90, resizable: true },
  { title: '地市', dataIndex: 'city', width: 80, resizable: true },
  { title: '接入地址', dataIndex: 'access_address', width: 200, ellipsis: true, resizable: true },
  { title: 'CRM订单号', dataIndex: 'crm_order_id', width: 150, ellipsis: true, resizable: true },
  { title: '专线集团产品号', dataIndex: 'line_group_product_number', width: 150, ellipsis: true, resizable: true },
  { title: '互联网工单', dataIndex: 'internet_work_order', width: 140, ellipsis: true, resizable: true },
  { title: '互联网工单状态', dataIndex: 'internet_work_order_status', width: 120, resizable: true },
  { title: '千里眼CRM订单号', dataIndex: 'ql_crm_order_id', width: 150, ellipsis: true, resizable: true },
  { title: '千里眼集团产品号', dataIndex: 'ql_group_product_number', width: 150, ellipsis: true, resizable: true },
  { title: '千里眼工单', dataIndex: 'ql_work_order', width: 140, ellipsis: true, resizable: true },
  { title: '千里眼工单状态', dataIndex: 'ql_work_order_status', width: 120, resizable: true },
];

const STORAGE_KEY = 'fc_hist_wo_col_widths';

export default function HistoricalWorkOrderList({ isAdmin }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState(undefined);
  const [cities, setCities] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const [colWidths, setColWidths] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  });

  const persistWidths = useCallback((updater) => {
    setColWidths(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    getHistoricalWorkOrderCities().then(r => setCities(r.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHistoricalWorkOrders({
        skip: (page - 1) * pageSize, limit: pageSize,
        search: search || undefined, city: cityFilter || undefined,
      });
      setData(res.data.items);
      setTotal(res.data.total);
    } catch { message.error('加载失败'); }
    setLoading(false);
  }, [page, search, pageSize, cityFilter]);

  useEffect(() => { setPage(1); }, [search, cityFilter]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const components = {
    header: { cell: ResizableTitle },
  };

  const handleResize = useCallback((index) => (e, { size }) => {
    persistWidths(prev => ({ ...prev, [index]: size.width }));
  }, [persistWidths]);

  const columns = baseColumns.map((col, index) => ({
    ...col,
    width: colWidths[index] || col.width,
    onHeaderCell: () => ({
      width: colWidths[index] || col.width,
      onResize: handleResize(index),
    }),
  }));

  const handleExport = async () => {
    try {
      const res = await exportHistoricalWorkOrders({ search: search || undefined, city: cityFilter || undefined });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `历史工单_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch { message.error('导出失败'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadHistoricalWorkOrders(file);
      message.success(res.data.message);
      fetchData();
    } catch (err) { message.error(err.response?.data?.detail || '导入失败'); }
    e.target.value = '';
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };

  const openEdit = (record) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleDelete = async (id) => {
    try { await deleteHistoricalWorkOrder(id); message.success('已删除'); fetchData(); }
    catch { message.error('删除失败'); }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateHistoricalWorkOrder(editing.id, values);
        message.success('更新成功');
      } else {
        await createHistoricalWorkOrder(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch { message.error('操作失败'); }
  };

  // 拼上操作列
  const displayColumns = isAdmin
    ? [...columns, {
        title: '操作', width: 140, fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      }]
    : columns;

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索站点编号/CRM订单号/工单/批次"
            prefix={<SearchOutlined />} value={search}
            onChange={e => setSearch(e.target.value)} onPressEnter={fetchData}
            style={{ width: 300 }}
          />
          <Select placeholder="地市" allowClear style={{ width: 120 }}
            value={cityFilter} onChange={v => setCityFilter(v)}
            options={(cities.length > 0 ? cities : guangdongCities).map(c => ({ label: c, value: c }))}
          />
        </Space>
        <Space>
          {isAdmin && (
            <>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              <Button icon={<UploadOutlined />} onClick={() => document.getElementById('hist-upload').click()}>导入清单</Button>
              <input id="hist-upload" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleUpload} />
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>
            </>
          )}
        </Space>
      </Space>

      <Table
        rowKey="id" components={components} columns={displayColumns}
        dataSource={data} loading={loading} scroll={{ x: 'max-content' }}
        pagination={{ current: page, pageSize, total, showTotal: t => `共 ${t} 条`, onChange: setPage }}
      />

      <Modal
        title={editing ? '编辑历史工单' : '新增历史工单'}
        open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        width={900} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <Form.Item name="site_code" label="站点编号" rules={[{ required: true, message: '必填' }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="batch" label="批次"><Input /></Form.Item>
          <Form.Item name="city" label="地市"><Select options={guangdongCities.map(c => ({ label: c, value: c }))} /></Form.Item>
          <Form.Item name="access_address" label="接入地址" style={{ gridColumn: '1 / -1' }}><TextArea rows={2} /></Form.Item>
          <Form.Item name="crm_order_id" label="CRM订单号"><Input /></Form.Item>
          <Form.Item name="line_group_product_number" label="专线集团产品号"><Input /></Form.Item>
          <Form.Item name="internet_work_order" label="互联网工单"><Input /></Form.Item>
          <Form.Item name="internet_work_order_status" label="互联网工单状态"><Input /></Form.Item>
          <Form.Item name="ql_crm_order_id" label="千里眼CRM订单号"><Input /></Form.Item>
          <Form.Item name="ql_group_product_number" label="千里眼集团产品号"><Input /></Form.Item>
          <Form.Item name="ql_work_order" label="千里眼工单"><Input /></Form.Item>
          <Form.Item name="ql_work_order_status" label="千里眼工单状态"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
