import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, Tooltip, message, Popconfirm, DatePicker, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownloadOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  getRequirements, createRequirement, updateRequirement, deleteRequirement, exportRequirements, uploadRequirements,
} from '../api';
import { isAdmin } from '../api/auth';
import { guangdongCities, cityDistricts } from '../data/guangdong';
import ResizableTitle from '../components/ResizableTitle';
import dayjs from 'dayjs';
import 'react-resizable/css/styles.css';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const statusLabels = {
  pending_review: '待评审', approved: '已通过', in_development: '开发中',
  completed: '已完成', closed: '已关闭', rejected: '已驳回',
};
const statusColors = {
  pending_review: 'default', approved: 'success', in_development: 'processing',
  completed: 'green', closed: 'default', rejected: 'error',
};

// 需求状态定义
const reqStatusLabels = {
  '待评审': '待评审',
  '处理中': '处理中',
  '已完工': '已完工',
  '待开发': '待开发',
};
const reqStatusColors = {
  '待评审': 'default',
  '处理中': 'processing',
  '已完工': 'success',
  '待开发': 'orange',
};

// 工单类型选项
const orderTypeOptions = [
  '网点新增', '网点迁移', '网点注销', '故障报修', '其他（请备注）',
];

// 业务字段列定义（按逻辑分组排列）
const baseColumns = [
  // ---- 基本信息 ----
  { title: '接收日期', dataIndex: 'receive_date', width: 100, resizable: true },
  // ---- 需求状态 ----
  {
    title: '需求状态', dataIndex: 'req_status', width: 100, resizable: true,
    render: (v) => <Tag color={reqStatusColors[v] || 'default'}>{v || '待开发'}</Tag>,
  },
  // ---- 联系人 ----
  {
    title: '业主姓名', dataIndex: 'owner_name', minWidth: 90, resizable: true,
    render: (v) => v ? <Tooltip title={v}><span style={{ cursor: 'pointer' }}>{maskName(v)}</span></Tooltip> : '',
  },
  {
    title: '联系方式', dataIndex: 'contact', width: 120, resizable: true,
    render: (v) => v ? <Tooltip title={v}><span style={{ cursor: 'pointer' }}>{maskPhone(v)}</span></Tooltip> : '',
  },
  // ---- 网点位置 ----
  { title: '市', dataIndex: 'city', width: 80, resizable: true },
  { title: '区/县', dataIndex: 'district', width: 80, resizable: true },
  { title: '网点号', dataIndex: 'outlet_code', width: 110, resizable: true },
  // ---- 业务类型 ----
  { title: '工单类型', dataIndex: 'order_type', width: 100, resizable: true },
  // ---- 详细地址 ----
  { title: '安装地址', dataIndex: 'install_address', ellipsis: true, minWidth: 160, resizable: true },
  // ---- 补充说明 ----
  { title: '备注', dataIndex: 'remark', ellipsis: true, minWidth: 140, resizable: true },
];

// 格式化日期为 YYYY-MM-DD
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 隐私脱敏
function maskName(name) {
  if (!name) return '';
  if (name.length <= 1) return '*';
  return name[0] + '*'.repeat(name.length - 1);
}
function maskPhone(phone) {
  if (!phone) return '';
  // 手机号: 138****1234
  if (phone.length >= 11) return phone.slice(0, 3) + '****' + phone.slice(-4);
  // 固话或其他: 保留前后各2位
  if (phone.length >= 6) return phone.slice(0, 2) + '****' + phone.slice(-2);
  return phone[0] + '****';
}

export default function RequirementList() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [dateRange, setDateRange] = useState(null);
  const [selectedCity, setSelectedCity] = useState(undefined);
  const [form] = Form.useForm();

  // 可拖拽列宽（持久化到 localStorage）
  const STORAGE_KEY = 'fc_req_col_widths';
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

  const resizableColumns = [
    ...columns,
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          {isAdmin() ? (
            <>
              <Button type="link" size="small" icon={<EditOutlined />}
                onClick={() => openEdit(record)}>编辑</Button>
              <Popconfirm title="确认删除此需求？" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </>
          ) : (
            <span style={{ color: '#999' }}>--</span>
          )}
        </Space>
      ),
    },
  ];

  // 获取当前市的区县列表
  const districts = selectedCity ? (cityDistricts[selectedCity] || []) : [];

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        search: search || undefined,
        ...filters,
      };
      // 日期范围：格式化为 YYYY-MM-DD 字符串
      if (dateRange && dateRange[0]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange && dateRange[1]) {
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await getRequirements(params);
      setData(res.data.items);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, filters, dateRange]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const openCreate = () => {
    if (!isAdmin()) {
      message.error('仅管理员可新增需求');
      return;
    }
    setEditing(null);
    form.resetFields();
    // 接收日期自动设为当前日期
    form.setFieldsValue({
      receive_date: todayStr(),
      order_type: '网点新增',
    });
    setSelectedCity(undefined);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    if (!isAdmin()) {
      message.error('仅管理员可编辑需求');
      return;
    }
    setEditing(record);
    form.setFieldsValue(record);
    setSelectedCity(record.city || undefined);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateRequirement(editing.id, values);
        message.success('更新成功');
      } else {
        await createRequirement(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRequirement(id);
      message.success('已删除');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const handleExport = async () => {
    try {
      const params = { search: search || undefined, ...filters };
      if (dateRange && dateRange[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange && dateRange[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
      const res = await exportRequirements(params);
      // 触发浏览器下载
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `需求列表_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      message.error('导出失败');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await uploadRequirements(file);
      message.success(res.data.message);
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail || '导入失败';
      message.error(detail);
    }
    e.target.value = '';
  };

  const orderTypeSelectOptions = orderTypeOptions.map(v => ({ label: v, value: v }));

  // 重置所有筛选条件
  const handleReset = () => {
    setSearch('');
    setFilters({});
    setDateRange(null);
    setPage(1);
  };

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '16px 0 16px 0' }}>
      {/* 筛选栏 */}
      <div style={{
        background: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: '12px 0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}>
        {/* 第一行：搜索 + 操作 */}
        <Row gutter={[12, 8]} align="middle">
          <Col flex="834px">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{
                border: '1px solid #d9d9d9', borderRadius: 6, display: 'flex', alignItems: 'center',
                background: '#fff', overflow: 'hidden', flex: 1,
              }}>
                <span style={{
                  padding: '5px 12px', fontSize: 14, color: '#434343', whiteSpace: 'nowrap',
                  borderRight: '1px solid #f0f0f0', userSelect: 'none',
                }}>搜索</span>
                <Input
                  placeholder="网点编号 / 业主姓名 / 联系方式"
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onPressEnter={handleSearch}
                  allowClear
                  variant="borderless"
                  style={{ flex: 1 }}
                />
              </div>
              <Button icon={<ReloadOutlined />} onClick={handleReset} style={{ fontSize: 14 }}>重置</Button>
            </div>
          </Col>
          <Col flex="1" />
          <Col>
            <Space size={8}>
              {isAdmin() && (
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              )}
              {isAdmin() && (
                <>
                  <Button type="primary" icon={<UploadOutlined />}
                    onClick={() => document.getElementById('req-excel-upload').click()}>导入清单</Button>
                  <input id="req-excel-upload" type="file" accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }} onChange={handleUpload} />
                </>
              )}
              {isAdmin() ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增需求</Button>
              ) : (
                <Button type="primary" icon={<PlusOutlined />} disabled>新增需求</Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* 第二行：筛选条件 */}
        <Row gutter={[12, 0]} align="middle" style={{ marginTop: 10 }}>
          <Col flex="834px">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                border: '1px solid #d9d9d9', borderRadius: 6, display: 'flex', alignItems: 'center',
                background: '#fff', overflow: 'hidden', width: 320,
              }}>
                <span style={{
                  padding: '5px 12px', fontSize: 14, color: '#434343', whiteSpace: 'nowrap',
                  borderRight: '1px solid #f0f0f0', userSelect: 'none',
                }}>接收日期</span>
                <RangePicker
                  placeholder={['开始日期', '结束日期']}
                  format="YYYY-MM-DD"
                  value={dateRange}
                  onChange={(dates) => { setDateRange(dates); setPage(1); }}
                  variant="borderless"
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{
                border: '1px solid #d9d9d9', borderRadius: 6, display: 'flex', alignItems: 'center',
                background: '#fff', overflow: 'hidden', width: 220,
              }}>
                <span style={{
                  padding: '5px 12px', fontSize: 14, color: '#434343', whiteSpace: 'nowrap',
                  borderRight: '1px solid #f0f0f0', userSelect: 'none',
                }}>市</span>
                <Select
                  mode="multiple" placeholder="全部" allowClear variant="borderless"
                  style={{ flex: 1, minWidth: 0 }} maxTagCount={1}
                  value={filters.city ? (Array.isArray(filters.city) ? filters.city : [filters.city]) : undefined}
                  onChange={(v) => setFilters({ ...filters, city: v })}
                  options={guangdongCities.map(c => ({ label: c, value: c }))}
                />
              </div>
              <div style={{
                border: '1px solid #d9d9d9', borderRadius: 6, display: 'flex', alignItems: 'center',
                background: '#fff', overflow: 'hidden', width: 260,
              }}>
                <span style={{
                  padding: '5px 12px', fontSize: 14, color: '#434343', whiteSpace: 'nowrap',
                  borderRight: '1px solid #f0f0f0', userSelect: 'none',
                }}>工单类型</span>
                <Select
                  mode="multiple" placeholder="全部" allowClear variant="borderless"
                  style={{ flex: 1, minWidth: 0 }} maxTagCount={1}
                  value={filters.order_type ? (Array.isArray(filters.order_type) ? filters.order_type : [filters.order_type]) : undefined}
                  onChange={(v) => setFilters({ ...filters, order_type: v })}
                  options={orderTypeSelectOptions}
                />
              </div>
            </div>
          </Col>
          <Col flex="1" />
        </Row>
      </div>
      </div>

      <Table
        rowKey="id"
        components={components}
        columns={resizableColumns}
        sticky={{ getContainer: () => document.getElementById('content-scroll'), offsetHeader: 133 }}
        dataSource={data}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (t) => `共 ${t} 条`,
          onChange: setPage,
        }}
      />

      <Modal
        title={editing ? '编辑需求' : '新增需求'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {/* 基本信息 */}
          <Form.Item name="receive_date" label="接收日期">
            <Input disabled />
          </Form.Item>
          <Form.Item name="order_type" label="工单类型" rules={[{ required: true, message: '请选择工单类型' }]}>
            <Select
              placeholder="选择工单类型"
              options={orderTypeSelectOptions}
            />
          </Form.Item>
          {/* 联系人 */}
          <Form.Item name="owner_name" label="业主姓名">
            <Input />
          </Form.Item>
          <Form.Item name="contact" label="联系方式">
            <Input />
          </Form.Item>
          {/* 网点位置 */}
          <Form.Item name="city" label="市" rules={[{ required: true, message: '请选择市' }]}>
            <Select
              placeholder="选择市"
              options={guangdongCities.map(c => ({ label: c, value: c }))}
              onChange={(v) => {
                setSelectedCity(v);
                form.setFieldsValue({ district: undefined });
              }}
            />
          </Form.Item>
          <Form.Item name="district" label="区/县" rules={[{ required: true, message: '请选择区/县' }]}>
            <Select
              placeholder="选择区/县"
              options={districts.map(d => ({ label: d, value: d }))}
              disabled={!selectedCity}
            />
          </Form.Item>
          <Form.Item name="outlet_code" label="网点号">
            <Input />
          </Form.Item>
          {/* 补充信息（占整行） */}
          <Form.Item name="install_address" label="安装地址"
            style={{ gridColumn: '1 / -1' }}>
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="remark" label="备注"
            style={{ gridColumn: '1 / -1' }}>
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
