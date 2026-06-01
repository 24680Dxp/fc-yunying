import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, message, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
  getRequirements, createRequirement, updateRequirement, deleteRequirement,
} from '../api';

const { TextArea } = Input;

const statusLabels = {
  pending_review: '待评审', approved: '已通过', in_development: '开发中',
  completed: '已完成', closed: '已关闭', rejected: '已驳回',
};
const statusColors = {
  pending_review: 'default', approved: 'success', in_development: 'processing',
  completed: 'green', closed: 'default', rejected: 'error',
};

// 10 个业务字段的列定义
const columns = [
  { title: '接收日期', dataIndex: 'receive_date', width: 100 },
  { title: '市', dataIndex: 'city', width: 90 },
  { title: '区/县', dataIndex: 'district', width: 90 },
  { title: '网点号', dataIndex: 'outlet_code', width: 110 },
  { title: '业主姓名', dataIndex: 'owner_name', width: 100 },
  { title: '联系方式', dataIndex: 'contact', width: 120 },
  { title: '工单类型', dataIndex: 'order_type', width: 100 },
  { title: '安装地址', dataIndex: 'install_address', ellipsis: true, width: 200 },
  { title: '产品编码', dataIndex: 'product_code', width: 130 },
  { title: '备注', dataIndex: 'remark', ellipsis: true, width: 180 },
];

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
  const [form] = Form.useForm();

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
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
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

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input
            placeholder="搜索业主姓名/网点号/联系方式"
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
            options={[
              { label: '广州市', value: '广州市' },
              { label: '深圳市', value: '深圳市' },
            ]}
          />
          <Select
            placeholder="工单类型"
            allowClear
            style={{ width: 120 }}
            value={filters.order_type}
            onChange={(v) => setFilters({ ...filters, order_type: v })}
            options={[
              { label: '宽带安装', value: '宽带安装' },
              { label: '故障维修', value: '故障维修' },
              { label: '移机', value: '移机' },
              { label: '注销', value: '注销' },
            ]}
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
        scroll={{ x: 1500 }}
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
          <Form.Item name="receive_date" label="接收日期">
            <Input placeholder="如: 2026-06-01" />
          </Form.Item>
          <Form.Item name="city" label="市">
            <Select
              options={[
                { label: '广州市', value: '广州市' },
                { label: '深圳市', value: '深圳市' },
              ]}
            />
          </Form.Item>
          <Form.Item name="district" label="区/县">
            <Input />
          </Form.Item>
          <Form.Item name="outlet_code" label="网点号">
            <Input />
          </Form.Item>
          <Form.Item name="owner_name" label="业主姓名">
            <Input />
          </Form.Item>
          <Form.Item name="contact" label="联系方式">
            <Input />
          </Form.Item>
          <Form.Item name="order_type" label="工单类型">
            <Select
              options={[
                { label: '宽带安装', value: '宽带安装' },
                { label: '故障维修', value: '故障维修' },
                { label: '移机', value: '移机' },
                { label: '注销', value: '注销' },
              ]}
            />
          </Form.Item>
          <Form.Item name="product_code" label="产品编码">
            <Input />
          </Form.Item>
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
