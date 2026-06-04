import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, Tooltip, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  getRequirements, createRequirement, updateRequirement, deleteRequirement,
} from '../api';
import { guangdongCities, cityDistricts } from '../data/guangdong';

const { TextArea } = Input;

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
const columns = [
  // ---- 基本信息 ----
  { title: '接收日期', dataIndex: 'receive_date', width: 100 },
  // ---- 需求状态 ----
  {
    title: '需求状态', dataIndex: 'req_status', width: 100,
    render: (v) => <Tag color={reqStatusColors[v] || 'default'}>{v || '待开发'}</Tag>,
  },
  // ---- 联系人 ----
  {
    title: '业主姓名', dataIndex: 'owner_name', minWidth: 90,
    render: (v) => v ? <Tooltip title={v}><span style={{ cursor: 'pointer' }}>{maskName(v)}</span></Tooltip> : '',
  },
  {
    title: '联系方式', dataIndex: 'contact', width: 120,
    render: (v) => v ? <Tooltip title={v}><span style={{ cursor: 'pointer' }}>{maskPhone(v)}</span></Tooltip> : '',
  },
  // ---- 网点位置 ----
  { title: '市', dataIndex: 'city', width: 80 },
  { title: '区/县', dataIndex: 'district', width: 80 },
  { title: '网点号', dataIndex: 'outlet_code', width: 110 },
  // ---- 业务类型 ----
  { title: '工单类型', dataIndex: 'order_type', width: 100 },
  // ---- 详细地址 ----
  { title: '安装地址', dataIndex: 'install_address', ellipsis: true, minWidth: 160 },
  // ---- 补充说明 ----
  { title: '备注', dataIndex: 'remark', ellipsis: true, minWidth: 140 },
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
  const [selectedCity, setSelectedCity] = useState(undefined);
  const [form] = Form.useForm();

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
      const res = await getRequirements(params);
      setData(res.data.items);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, filters]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const openCreate = () => {
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
      message.success('已关闭');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const orderTypeSelectOptions = orderTypeOptions.map(v => ({ label: v, value: v }));

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索网点编号/业主姓名/联系方式"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 260 }}
          />
          <Select
            placeholder="市"
            allowClear
            style={{ width: 110 }}
            value={filters.city}
            onChange={(v) => setFilters({ ...filters, city: v })}
            options={guangdongCities.map(c => ({ label: c, value: c }))}
          />
          <Select
            placeholder="工单类型"
            allowClear
            style={{ width: 130 }}
            value={filters.order_type}
            onChange={(v) => setFilters({ ...filters, order_type: v })}
            options={orderTypeSelectOptions}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增需求
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={[
          ...columns,
          {
            title: '操作', width: 120, fixed: 'right',
            render: (_, record) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}
                  onClick={() => openEdit(record)}>编辑</Button>
                <Popconfirm title="确认关闭此需求？" onConfirm={() => handleDelete(record.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>关闭</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
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
