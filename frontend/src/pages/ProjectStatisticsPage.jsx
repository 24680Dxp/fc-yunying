import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Spin, Space, Typography,
} from 'antd';
import {
  OrderedListOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  EyeOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  getHistoricalSummary,
  getHistoricalByCity,
} from '../api';

const { Text } = Typography;
const cardStyle = { borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

export default function ProjectStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byCity, setByCity] = useState([]);

  useEffect(() => {
    Promise.all([
      getHistoricalSummary(),
      getHistoricalByCity(),
    ]).then(([summaryRes, cityRes]) => {
      setSummary(summaryRes.data);
      setByCity(cityRes.data);
    }).catch(() => {
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const totalRecords = summary?.total || 0;
  const cityCount = summary?.city_count || 0;
  const internetCount = summary?.internet_count || 0;
  const qianliyanCount = summary?.qianliyan_count || 0;

  // 地市表合计行
  const cityTotalRow = {
    name: '合计',
    total: byCity.reduce((s, r) => s + r.total, 0),
    internet_count: byCity.reduce((s, r) => s + r.internet_count, 0),
    qianliyan_count: byCity.reduce((s, r) => s + r.qianliyan_count, 0),
  };
  const cityWithTotal = [...byCity, cityTotalRow];

  return (
    <div>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '16px 0 16px 0' }}>
      {/* 总览卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="历史工单总数"
              value={totalRecords}
              prefix={<OrderedListOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="涉及地市数"
              value={cityCount}
              prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="专线工单数"
              value={internetCount}
              prefix={<GlobalOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={cardStyle}>
            <Statistic
              title="千里眼工单数"
              value={qianliyanCount}
              prefix={<EyeOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>
      </div>

      {/* 按地市统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={<Space><BarChartOutlined />按地市统计</Space>}
            style={cardStyle}
          >
            <Table
              rowKey="name"
              dataSource={cityWithTotal}
              pagination={false}
              size="small"
              scroll={{ x: 700 }}
              columns={[
                {
                  title: '地市', dataIndex: 'name', width: 120,
                  render: (v, r) => r.name === '合计'
                    ? <span style={{ fontWeight: 700 }}>{v}</span>
                    : v,
                },
                {
                  title: '工单总数', dataIndex: 'total', width: 100,
                  render: (v, r) => (
                    <span style={{ fontWeight: r.name === '合计' ? 700 : 600, color: '#1890ff' }}>{v}</span>
                  ),
                },
                {
                  title: '专线工单', dataIndex: 'internet_count', width: 100,
                  render: (v, r) => (
                    <span style={{ color: r.name === '合计' ? '#1890ff' : '#722ed1', fontWeight: r.name === '合计' ? 700 : 400 }}>{v}</span>
                  ),
                },
                {
                  title: '千里眼工单', dataIndex: 'qianliyan_count', width: 100,
                  render: (v, r) => (
                    <span style={{ color: r.name === '合计' ? '#1890ff' : '#fa8c16', fontWeight: r.name === '合计' ? 700 : 400 }}>{v}</span>
                  ),
                },
                {
                  title: '占比', width: 80,
                  render: (_, r) => {
                    if (r.name === '合计') return null;
                    const pct = totalRecords ? ((r.total / totalRecords) * 100).toFixed(1) : 0;
                    return <Text type="secondary">{pct}%</Text>;
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
