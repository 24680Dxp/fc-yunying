import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Spin, Space,
} from 'antd';
import {
  FileTextOutlined,
  OrderedListOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import {
  getStatisticsTotal,
  getStatisticsByOperationType,
  getStatisticsByProductCategory,
  getStatisticsByStatus,
  getStatisticsByCity,
  getStatisticsActiveByCity,
  getStatisticsActiveByCityDetail,
  getStatisticsCrossOperationCategory,
} from '../api';

const cardStyle = { borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(null);
  const [byOperationType, setByOperationType] = useState([]);
  const [byProductCategory, setByProductCategory] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [byCity, setByCity] = useState([]);
  const [activeByCity, setActiveByCity] = useState([]);
  const [activeByCityDetail, setActiveByCityDetail] = useState([]);
  const [crossData, setCrossData] = useState([]);

  useEffect(() => {
    Promise.all([
      getStatisticsTotal(),
      getStatisticsByOperationType(),
      getStatisticsByProductCategory(),
      getStatisticsByStatus(),
      getStatisticsByCity(),
      getStatisticsActiveByCity(),
      getStatisticsActiveByCityDetail(),
      getStatisticsCrossOperationCategory(),
    ]).then(([totalRes, opRes, catRes, statusRes, cityRes, activeCityRes, activeDetailRes, crossRes]) => {
      setTotal(totalRes.data);
      setByOperationType(opRes.data);
      setByProductCategory(catRes.data);
      setByStatus(statusRes.data);
      setByCity(cityRes.data);
      setActiveByCity(activeCityRes.data);
      setActiveByCityDetail(activeDetailRes.data);
      setCrossData(crossRes.data);
    }).catch(() => {
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const totalWorkOrders = total?.total_work_orders || 0;
  const activeCount = total?.active_work_orders || 0;
  const archivedCount = total?.archived_work_orders || 0;
  const totalRequirements = total?.total_requirements || 0;
  const activeTotal = activeByCity.reduce((s, i) => s + i.count, 0);

  // 合计行：active-by-city-detail
  const detailTotalRow = {
    name: '合计',
    total: activeByCityDetail.reduce((s, r) => s + r.total, 0),
    qianliyan_open: activeByCityDetail.reduce((s, r) => s + r.qianliyan_open, 0),
    qianliyan_adjust: activeByCityDetail.reduce((s, r) => s + r.qianliyan_adjust, 0),
    qianliyan_cancel: activeByCityDetail.reduce((s, r) => s + r.qianliyan_cancel, 0),
    internet_open: activeByCityDetail.reduce((s, r) => s + r.internet_open, 0),
    internet_cancel: activeByCityDetail.reduce((s, r) => s + r.internet_cancel, 0),
  };
  const detailWithTotal = [...activeByCityDetail, detailTotalRow];

  // 合并表合计行
  const crossTotal = {
    operation_type: '合计',
    internet: crossData.reduce((s, r) => s + r.internet, 0),
    qianliyan: crossData.reduce((s, r) => s + r.qianliyan, 0),
    total: crossData.reduce((s, r) => s + r.total, 0),
  };
  const crossWithTotal = [...crossData, crossTotal];

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '16px 0 16px 0' }}>
      {/* 总览卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="工单总数"
              value={totalWorkOrders}
              prefix={<OrderedListOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="开通中"
              value={activeCount}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="已归档"
              value={archivedCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="需求总数"
              value={totalRequirements}
              prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      </div>

      {/* 明细表格 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title={<Space><BarChartOutlined />操作类型 × 产品分类统计</Space>} style={cardStyle}>
            <Table
              rowKey="operation_type"
              dataSource={crossWithTotal}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              columns={[
                { title: '操作类型', dataIndex: 'operation_type', width: 120,
                  render: (v, r) => r.operation_type === '合计'
                    ? <span style={{ fontWeight: 700 }}>{v}</span>
                    : v,
                },
                { title: '互联网专线', dataIndex: 'internet', width: 100,
                  render: (v, r) => r.operation_type === '合计'
                    ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span>
                    : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                { title: '千里眼', dataIndex: 'qianliyan', width: 100,
                  render: (v, r) => r.operation_type === '合计'
                    ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span>
                    : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                { title: '小计', dataIndex: 'total', width: 80,
                  render: (v, r) => r.operation_type === '合计'
                    ? <span style={{ fontWeight: 700 }}>{v}</span>
                    : v,
                },
                {
                  title: '占比', width: 100,
                  render: (_, r) => {
                    const pct = totalWorkOrders ? ((r.total / totalWorkOrders) * 100).toFixed(1) : 0;
                    return <span>{pct}%</span>;
                  },
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title={<Space><RiseOutlined />在途工单统计（开通中，共 {activeTotal} 条）</Space>}
            style={cardStyle}
          >
            <Table
              rowKey="name"
              dataSource={detailWithTotal}
              pagination={false}
              size="small"
              scroll={{ x: 1100 }}
              columns={[
                {
                  title: '地市', dataIndex: 'name', width: 100, fixed: 'left',
                  render: (v, r) => r.name === '合计'
                    ? <span style={{ fontWeight: 700 }}>{v}</span>
                    : v,
                },
                {
                  title: '在途工单总数', dataIndex: 'total', width: 110,
                  render: (v, r) => r.name === '合计'
                    ? <span style={{ fontWeight: 700, color: '#faad14' }}>{v}</span>
                    : <span style={{ fontWeight: 600, color: '#faad14' }}>{v}</span>,
                },
                {
                  title: '千里眼开通在途', dataIndex: 'qianliyan_open', width: 120,
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span> : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                {
                  title: '千里眼调整在途', dataIndex: 'qianliyan_adjust', width: 120,
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span> : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                {
                  title: '千里眼取消在途', dataIndex: 'qianliyan_cancel', width: 120,
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span> : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                {
                  title: '互联网开通在途', dataIndex: 'internet_open', width: 120,
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span> : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
                {
                  title: '互联网取消在途', dataIndex: 'internet_cancel', width: 120,
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700, color: '#1890ff' }}>{v}</span> : <span style={{ color: '#1890ff' }}>{v}</span>,
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={<Space><BarChartOutlined />按业务所属地市统计</Space>} style={cardStyle}>
            <Table
              rowKey="name"
              dataSource={byCity}
              pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 个城市` }}
              size="small"
              columns={[
                { title: '地市', dataIndex: 'name', width: 120 },
                {
                  title: '工单数', dataIndex: 'count', width: 80,
                  render: (v) => <span style={{ fontWeight: 600, color: '#1890ff' }}>{v}</span>,
                },
                {
                  title: '占比', width: 100,
                  render: (_, r) => {
                    const pct = totalWorkOrders ? ((r.count / totalWorkOrders) * 100).toFixed(1) : 0;
                    return <span>{pct}%</span>;
                  },
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
