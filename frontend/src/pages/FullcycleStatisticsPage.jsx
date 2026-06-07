import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Spin, Space, Typography,
} from 'antd';
import {
  OrderedListOutlined,
  ProjectOutlined,
  HistoryOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  EyeOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  getFullcycleSummary,
  getFullcycleByCity,
  getStatisticsByProductCategory,
} from '../api';

const { Text } = Typography;
const cardStyle = { borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

export default function FullcycleStatisticsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [byCity, setByCity] = useState([]);
  const [productCategory, setProductCategory] = useState([]);

  useEffect(() => {
    Promise.all([
      getFullcycleSummary(),
      getFullcycleByCity(),
      getStatisticsByProductCategory(),
    ]).then(([summaryRes, cityRes, catRes]) => {
      setSummary(summaryRes.data);
      setByCity(cityRes.data);
      setProductCategory(catRes.data);
    }).catch(() => {
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const grandTotal = summary?.grand_total || 0;
  const operationTotal = summary?.operation_total || 0;
  const operationInternet = summary?.operation_internet || 0;
  const operationQl = summary?.operation_qianliyan || 0;
  const histTotal = summary?.hist_total || 0;
  const histInternet = summary?.hist_internet_count || 0;
  const histQl = summary?.hist_qianliyan_count || 0;
  const requirements = summary?.operation_requirements || 0;
  const validSite = summary?.valid_site_count || 0;
  const validActive = summary?.valid_active_count || 0;
  const validFinished = validSite - validActive;

  // 地市合计行
  const cityTotalRow = {
    name: '合计',
    operation_count: byCity.reduce((s, r) => s + r.operation_count, 0),
    hist_count: byCity.reduce((s, r) => s + r.hist_count, 0),
    total: byCity.reduce((s, r) => s + r.total, 0),
  };
  const cityWithTotal = [...byCity, cityTotalRow];

  // 产品分类合计
  const catTotal = { name: '合计', count: productCategory.reduce((s, r) => s + r.count, 0) };
  const catWithTotal = [...productCategory, catTotal];

  return (
    <div>
      {/* 总览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card style={cardStyle}>
            <Statistic
              title="运营期需求总数"
              value={requirements}
              prefix={<FileTextOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card style={cardStyle}>
            <Statistic
              title="全周期工单总数"
              value={grandTotal}
              prefix={<OrderedListOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card style={cardStyle}>
            <Statistic
              title="运营期工单"
              value={operationTotal}
              prefix={<ProjectOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>
                  专线 {operationInternet} / 千里眼 {operationQl}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card style={cardStyle}>
            <Statistic
              title="建设期工单"
              value={histTotal}
              prefix={<HistoryOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
              suffix={
                <span style={{ fontSize: 13, color: '#999', marginLeft: 8 }}>
                  专线 {histInternet} / 千里眼 {histQl}
                </span>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={5}>
          <Card style={cardStyle}>
            <Statistic
              title="当前有效站点总数"
              value={validSite}
              prefix={<EnvironmentOutlined style={{ color: '#13c2c2' }} />}
              valueStyle={{ color: '#13c2c2' }}
              suffix={
                <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                  <div>新增&迁移施工中 {validActive}</div>
                  <div>已完工 {validFinished}</div>
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 明细 */}
      <Row gutter={[16, 16]}>
        {/* 主表：地市全周期对比 */}
        <Col xs={24}>
          <Card
            title={<Space><BarChartOutlined />地市全周期对比</Space>}
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
                  title: '运营期工单', dataIndex: 'operation_count', width: 110,
                  render: (v, r) => (
                    <span style={{ fontWeight: r.name === '合计' ? 700 : 500, color: '#52c41a' }}>{v}</span>
                  ),
                },
                {
                  title: '建设期工单', dataIndex: 'hist_count', width: 110,
                  render: (v, r) => (
                    <span style={{ fontWeight: r.name === '合计' ? 700 : 500, color: '#722ed1' }}>{v}</span>
                  ),
                },
                {
                  title: '全周期合计', dataIndex: 'total', width: 110,
                  render: (v, r) => (
                    <span style={{ fontWeight: r.name === '合计' ? 700 : 600, color: '#1890ff' }}>{v}</span>
                  ),
                },
                {
                  title: '占比', width: 80,
                  render: (_, r) => {
                    if (r.name === '合计') return null;
                    const pct = grandTotal ? ((r.total / grandTotal) * 100).toFixed(1) : 0;
                    return <Text type="secondary">{pct}%</Text>;
                  },
                },
              ]}
            />
          </Card>
        </Col>

        {/* 运营期产品分类分布 */}
        <Col xs={24} md={12}>
          <Card
            title={<Space><GlobalOutlined />运营期 — 产品分类分布</Space>}
            style={cardStyle}
          >
            <Table
              rowKey="name"
              dataSource={catWithTotal}
              pagination={false}
              size="small"
              columns={[
                { title: '产品分类', dataIndex: 'name',
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700 }}>{v}</span> : v,
                },
                { title: '工单数', dataIndex: 'count', width: 80,
                  render: (v, r) => <span style={{ fontWeight: r.name === '合计' ? 700 : 500, color: '#52c41a' }}>{v}</span>,
                },
                { title: '占比', width: 80,
                  render: (_, r) => {
                    if (r.name === '合计') return null;
                    const pct = operationTotal ? ((r.count / operationTotal) * 100).toFixed(1) : 0;
                    return <Text type="secondary">{pct}%</Text>;
                  },
                },
              ]}
            />
          </Card>
        </Col>

        {/* 建设期专线/千里眼分布 */}
        <Col xs={24} md={12}>
          <Card
            title={<Space><EyeOutlined />建设期 — 互联网专线/千里眼分布</Space>}
            style={cardStyle}
          >
            <Table
              rowKey="name"
              dataSource={[
                { name: '互联网专线', count: histInternet },
                { name: '千里眼', count: histQl },
                { name: '合计', count: histInternet + histQl },
              ]}
              pagination={false}
              size="small"
              columns={[
                { title: '类型', dataIndex: 'name',
                  render: (v, r) => r.name === '合计' ? <span style={{ fontWeight: 700 }}>{v}</span> : v,
                },
                { title: '工单数', dataIndex: 'count', width: 80,
                  render: (v, r) => <span style={{ fontWeight: r.name === '合计' ? 700 : 500, color: '#722ed1' }}>{v}</span>,
                },
                { title: '占比', width: 80,
                  render: (_, r) => {
                    if (r.name === '合计') return null;
                    const pct = histTotal ? ((r.count / histTotal) * 100).toFixed(1) : 0;
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
