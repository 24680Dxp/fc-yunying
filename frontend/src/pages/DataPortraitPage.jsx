import React, { useState, useEffect, useRef } from 'react';
import { Spin, Card, Row, Col } from 'antd';
import { getPortraitData } from '../api';

// ECharts will be lazy-loaded via dynamic import to avoid issues
const ReactECharts = React.lazy(() => import('echarts-for-react'));

const chartColors = {
  completed: '#26a69a',
  inprogress: '#ef5350',
  internet: '#42a5f5',
  qianliyan: '#ff7043',
  cancel: '#ab47bc',
  open: '#26a69a',
  adjust: '#ff7043',
  primary: '#5c6bc0',
};

const KpiCard = ({ label, value, sub, color }) => (
  <div style={{
    background: '#fff', borderRadius: 10, padding: '16px 12px',
    boxShadow: '0 2px 8px rgba(0,0,0,.06)', textAlign: 'center',
    borderTop: `3px solid ${color}`, minWidth: 0,
  }}>
    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{
    fontSize: 16, fontWeight: 700, color: '#1a237e',
    margin: '20px 0 12px', paddingBottom: 8,
    borderBottom: '2px solid #e8eaf6',
    display: 'flex', alignItems: 'center', gap: 8,
  }}>
    <span style={{ width: 4, height: 20, background: '#3949ab', borderRadius: 2, display: 'inline-block' }} />
    {children}
  </div>
);

export default function DataPortraitPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getPortraitData();
      setData(res.data);
      setError(null);
    } catch (e) {
      setError('数据加载失败: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" tip="加载数据画像..." /></div>;
  if (error) return <div style={{ textAlign: 'center', padding: 100, color: 'red' }}>{error}</div>;
  if (!data || !data.overview) return <div style={{ textAlign: 'center', padding: 100 }}>暂无数据</div>;

  const ov = data.overview || {};
  const ps = data.product_stats || [];
  const pline = ps.find(p => p['产品分类'] === '互联网专线') || {};
  const pqly = ps.find(p => p['产品分类'] === '千里眼') || {};
  const cs = data.city_stats || [];

  const kpis = [
    { label: '总工单数', value: ov.total_detail_rows || 0, color: '#5c6bc0' },
    { label: '已完成', value: `${ov.total_completed || 0} (${ov.overall_completion_rate || 0}%)`, color: '#26a69a' },
    { label: '在途', value: `${ov.total_in_progress || 0} (${ov.overall_in_progress_rate || 0}%)`, color: '#ef5350' },
    { label: '专线完成率', value: `${pline.completion_rate || 0}%`, color: '#42a5f5' },
    { label: '千里眼完成率', value: `${pqly.completion_rate || 0}%`, color: '#ff7043' },
    { label: '地市数', value: cs.length || 0, color: '#ab47bc' },
  ];

  const timeRange = ov.time_range || {};
  const headerTime = timeRange.start ? `${String(timeRange.start).slice(0, 10)} ~ ${String(timeRange.end).slice(0, 10)}` : '';

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a237e, #283593, #3949ab)',
        borderRadius: 12, padding: '18px 28px', marginBottom: 16,
        boxShadow: '0 4px 20px rgba(26,35,126,.3)',
        color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>广东福彩运维工单数据画像</h2>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>统计时间: {headerTime || '-'}</div>
        </div>
        <div style={{ fontSize: 12, opacity: .7 }}>数据生成: {data.generated_at || '-'}</div>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16,
      }}>
        {kpis.map((k, i) => <KpiCard key={i} {...k} />)}
      </div>

      {/* Section 1: Overview */}
      <SectionTitle>总览</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="已完成 vs 在途占比" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <OverviewPie data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="产品完成率对比" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <ProductBar data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 2: Business Type */}
      <SectionTitle>业务类型维度</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="各类业务完成率" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <BizRate data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="完成 / 在途堆叠" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <BizStack data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 3: Product x Biz Cross - Heatmap */}
      <SectionTitle>产品 × 业务交叉分析</SectionTitle>
      <Card size="small" title="完成率矩阵（热力图）" bodyStyle={{ padding: 8 }}>
        <React.Suspense fallback={<div style={{ height: 240 }} />}>
          <HeatmapChart data={data} />
        </React.Suspense>
      </Card>

      {/* Section 4: City */}
      <SectionTitle>地市维度</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="工单量排名" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 400 }} />}>
              <CityVolume data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="完成率排名" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 400 }} />}>
              <CityRate data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 5: Step Bottleneck */}
      <SectionTitle>环节瓶颈分析（在途工单）</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="在途工单环节分布" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <StepDist data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="环节 × 产品交叉" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <StepProduct data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 6: Time Trend */}
      <SectionTitle>时间趋势</SectionTitle>
      <Card size="small" title="月度派单量趋势" bodyStyle={{ padding: 8 }} style={{ marginBottom: 12 }}>
        <React.Suspense fallback={<div style={{ height: 320 }} />}>
          <MonthlyChart data={data} />
        </React.Suspense>
      </Card>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="月度 × 产品趋势" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 280 }} />}>
              <MonthProduct data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="月度 × 业务类型趋势" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 280 }} />}>
              <MonthBiz data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 7: Adjustment In-Progress Deep */}
      <SectionTitle>调整在途深度分析（{data.adjustment_inprogress?.total || 0}单）</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="在途环节分布" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <AdjStep data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="积压天数分布" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <AdjBacklog data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>
      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col span={12}>
          <Card size="small" title="环节 × 产品交叉" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <AdjStepProd data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="月度在途新增趋势" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <AdjMonthly data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Section 8: Cancellation In-Progress Deep */}
      <SectionTitle>销户在途深度分析（{data.cancellation_inprogress?.total || 0}单）</SectionTitle>
      <Row gutter={12}>
        <Col span={12}>
          <Card size="small" title="在途环节分布" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <CanStep data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="积压天数分布" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <CanBacklog data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>
      <Row gutter={12} style={{ marginTop: 12 }}>
        <Col span={12}>
          <Card size="small" title="环节 × 产品交叉" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <CanStepProd data={data} />
            </React.Suspense>
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="月度在途新增趋势" bodyStyle={{ padding: 8 }}>
            <React.Suspense fallback={<div style={{ height: 300 }} />}>
              <CanMonthly data={data} />
            </React.Suspense>
          </Card>
        </Col>
      </Row>

      {/* Meizhou deep */}
      {data.cancellation_inprogress?.meizhou_deep && (
        <>
          <SectionTitle>梅州销户深度拆解（{data.cancellation_inprogress.meizhou_deep.total}单在途）</SectionTitle>
          <Row gutter={12}>
            <Col span={12}>
              <Card size="small" title="环节分布" bodyStyle={{ padding: 8 }}>
                <React.Suspense fallback={<div style={{ height: 300 }} />}>
                  <MzSteps data={data} />
                </React.Suspense>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="千里眼 vs 专线 拆分" bodyStyle={{ padding: 8 }}>
                <React.Suspense fallback={<div style={{ height: 300 }} />}>
                  <MzProd data={data} />
                </React.Suspense>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Section 9: Risk Cards */}
      <SectionTitle>风险提示</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <RiskCards data={data} />
      </div>

      <div style={{ textAlign: 'center', padding: '12px 0', color: '#999', fontSize: 12, borderTop: '1px solid #f0f0f0' }}>
        数据来源：FC项目交互支撑系统 · 更新时间：{data.generated_at || '-'}
      </div>
    </div>
  );
}

// ============ Chart Sub-components ============

const defaultOpts = { renderer: 'canvas' };
const notMerge = true;

function OverviewPie({ data }) {
  const ov = data.overview || {};
  const option = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: ['45%', '72%'], center: ['50%', '52%'],
      label: { show: true, formatter: '{b}\n{d}%' },
      data: [
        { value: ov.total_completed || 0, name: '已完成', itemStyle: { color: chartColors.completed } },
        { value: ov.total_in_progress || 0, name: '在途', itemStyle: { color: chartColors.inprogress } },
      ],
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function ProductBar({ data }) {
  const ps = data.product_stats || [];
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ps.map(p => p['产品分类']) },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar', data: ps.map(p => p.completion_rate),
      itemStyle: { color: (p) => p.value > 70 ? chartColors.completed : chartColors.inprogress },
      label: { show: true, position: 'top', formatter: '{c}%' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function BizRate({ data }) {
  const bs = data.biz_stats || [];
  const colors = [chartColors.internet, chartColors.qianliyan, chartColors.cancel];
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: bs.map(b => b['业务类型']) },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{
      type: 'bar', data: bs.map(b => b.completion_rate),
      itemStyle: { color: (p) => colors[p.dataIndex] || '#888' },
      label: { show: true, position: 'top', formatter: '{c}%' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function BizStack({ data }) {
  const bs = data.biz_stats || [];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['已完成', '在途'] },
    xAxis: { type: 'category', data: bs.map(b => b['业务类型']) },
    yAxis: { type: 'value' },
    series: [
      { name: '已完成', type: 'bar', stack: 'total', data: bs.map(b => b.completed), itemStyle: { color: chartColors.completed }, label: { show: true, position: 'inside' } },
      { name: '在途', type: 'bar', stack: 'total', data: bs.map(b => b.in_progress), itemStyle: { color: '#ef9a9a' }, label: { show: true, position: 'inside' } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function HeatmapChart({ data }) {
  const cpb = data.cross_product_biz || {};
  const prods = ['互联网专线', '千里眼'];
  const bizs = ['开通', '调整', '销户'];
  const hd = [];
  bizs.forEach((biz, yi) => {
    prods.forEach((prod, xi) => {
      hd.push([xi, yi, (cpb[biz] || {})[prod] || 0]);
    });
  });
  const option = {
    tooltip: { formatter: (p) => prods[p.value[0]] + ' × ' + bizs[p.value[1]] + '<br/>完成率: ' + p.value[2] + '%' },
    xAxis: { type: 'category', data: prods, splitArea: { show: true } },
    yAxis: { type: 'category', data: bizs, splitArea: { show: true } },
    visualMap: { min: 0, max: 100, inRange: { color: ['#ffcdd2', '#fff9c4', '#c8e6c9'] }, show: false },
    series: [{ type: 'heatmap', data: hd, label: { show: true, formatter: '{c}%' } }],
  };
  return <ReactECharts option={option} style={{ height: 240 }} opts={defaultOpts} notMerge={notMerge} />;
}

function CityVolume({ data }) {
  const cs = (data.city_stats || []).slice(0, 15).reverse();
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 80 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: cs.map(x => x['地市']), inverse: true },
    series: [{
      type: 'bar', data: cs.map(x => x.total_orders),
      itemStyle: { color: chartColors.primary }, label: { show: true, position: 'right' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 400 }} opts={defaultOpts} notMerge={notMerge} />;
}

function CityRate({ data }) {
  const cs = [...(data.city_stats || [])].sort((a, b) => b.completion_rate - a.completion_rate).reverse();
  const option = {
    tooltip: { trigger: 'axis', formatter: (p) => p[0].name + ': ' + p[0].value + '%' },
    grid: { left: 80 },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: cs.map(x => x['地市']), inverse: true },
    series: [{
      type: 'bar', data: cs.map(x => x.completion_rate),
      itemStyle: { color: (p) => p.value < 50 ? chartColors.inprogress : p.value < 70 ? chartColors.qianliyan : chartColors.completed },
      label: { show: true, position: 'right', formatter: '{c}%' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 400 }} opts={defaultOpts} notMerge={notMerge} />;
}

function StepDist({ data }) {
  const si = data.step_inprogress || {};
  const entries = Object.entries(si).sort((a, b) => b[1] - a[1]);
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar', data: entries.map(e => e[1]),
      itemStyle: { color: (p) => p.value >= 100 ? chartColors.inprogress : p.value >= 50 ? chartColors.qianliyan : chartColors.internet },
      label: { show: true, position: 'top' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function StepProduct({ data }) {
  const isp = data.inprog_step_product || {};
  const iKeys = Object.keys(isp['互联网专线'] || {});
  const qKeys = Object.keys(isp['千里眼'] || {});
  const uniqueSteps = [...new Set([...iKeys, ...qKeys])].sort((a, b) => {
    const va = (isp['互联网专线'] || {})[a] || 0 + (isp['千里眼'] || {})[a] || 0;
    const vb = (isp['互联网专线'] || {})[b] || 0 + (isp['千里眼'] || {})[b] || 0;
    return vb - va;
  });
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['互联网专线', '千里眼'] },
    xAxis: { type: 'category', data: uniqueSteps, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [
      { name: '互联网专线', type: 'bar', stack: 'total', data: uniqueSteps.map(s => (isp['互联网专线'] || {})[s] || 0), itemStyle: { color: chartColors.internet } },
      { name: '千里眼', type: 'bar', stack: 'total', data: uniqueSteps.map(s => (isp['千里眼'] || {})[s] || 0), itemStyle: { color: chartColors.qianliyan } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function MonthlyChart({ data }) {
  const mt = data.monthly_trend || [];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['派单总量', '已完成', '在途'] },
    xAxis: { type: 'category', data: mt.map(m => m['月份']) },
    yAxis: { type: 'value' },
    series: [
      { name: '派单总量', type: 'line', data: mt.map(m => m.total_orders), smooth: true, itemStyle: { color: chartColors.primary } },
      { name: '已完成', type: 'line', data: mt.map(m => m.completed), smooth: true, itemStyle: { color: chartColors.completed } },
      { name: '在途', type: 'line', data: mt.map(m => m.in_progress), smooth: true, itemStyle: { color: chartColors.inprogress } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 320 }} opts={defaultOpts} notMerge={notMerge} />;
}

function MonthProduct({ data }) {
  const cmp = data.cross_month_product || {};
  const months = data.monthly_trend ? data.monthly_trend.map(m => m['月份']) : [];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['互联网专线', '千里眼'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '互联网专线', type: 'line', data: months.map(m => (cmp['互联网专线'] || {})[m] || 0), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.internet } },
      { name: '千里眼', type: 'line', data: months.map(m => (cmp['千里眼'] || {})[m] || 0), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.qianliyan } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 280 }} opts={defaultOpts} notMerge={notMerge} />;
}

function MonthBiz({ data }) {
  const cmb = data.cross_month_biz || {};
  const months = data.monthly_trend ? data.monthly_trend.map(m => m['月份']) : [];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['开通', '调整', '销户'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '开通', type: 'line', data: months.map(m => (cmb['开通'] || {})[m] || 0), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.open } },
      { name: '调整', type: 'line', data: months.map(m => (cmb['调整'] || {})[m] || 0), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.adjust } },
      { name: '销户', type: 'line', data: months.map(m => (cmb['销户'] || {})[m] || 0), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.cancel } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 280 }} opts={defaultOpts} notMerge={notMerge} />;
}

// Adjustment deep charts
function AdjStep({ data }) {
  const adj = data.adjustment_inprogress || {};
  const steps = adj.step_distribution || {};
  const entries = Object.entries(steps).sort((a, b) => b[1] - a[1]);
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(e => e[1]), itemStyle: { color: chartColors.inprogress }, label: { show: true, position: 'top' } }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function AdjBacklog({ data }) {
  const adj = data.adjustment_inprogress || {};
  const bins = adj.backlog_bins || [];
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: bins.map(b => b.range) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar', data: bins.map(b => b.count),
      itemStyle: { color: (p) => p.dataIndex >= 3 ? chartColors.inprogress : p.dataIndex >= 2 ? chartColors.qianliyan : chartColors.internet },
      label: { show: true, position: 'top' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function AdjStepProd({ data }) {
  const adj = data.adjustment_inprogress || {};
  const sp = adj.step_product_cross || {};
  const steps = Object.keys(sp).sort((a, b) => {
    const va = Object.values(sp[a] || {}).reduce((s, v) => s + v, 0);
    const vb = Object.values(sp[b] || {}).reduce((s, v) => s + v, 0);
    return vb - va;
  });
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['互联网专线', '千里眼'] },
    xAxis: { type: 'category', data: steps, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [
      { name: '互联网专线', type: 'bar', stack: 'total', data: steps.map(s => (sp[s] || {})['互联网专线'] || 0), itemStyle: { color: chartColors.internet } },
      { name: '千里眼', type: 'bar', stack: 'total', data: steps.map(s => (sp[s] || {})['千里眼'] || 0), itemStyle: { color: chartColors.qianliyan } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function AdjMonthly({ data }) {
  const adj = data.adjustment_inprogress || {};
  const mc = adj.monthly_count || {};
  const months = Object.keys(mc).sort();
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: months.map(m => mc[m]), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.inprogress }, label: { show: true } }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

// Cancellation deep charts
function CanStep({ data }) {
  const can = data.cancellation_inprogress || {};
  const steps = can.step_distribution || {};
  const entries = Object.entries(steps).sort((a, b) => b[1] - a[1]);
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(e => e[1]), itemStyle: { color: chartColors.cancel }, label: { show: true, position: 'top' } }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function CanBacklog({ data }) {
  const can = data.cancellation_inprogress || {};
  const bins = can.backlog_bins || [];
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: bins.map(b => b.range) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar', data: bins.map(b => b.count),
      itemStyle: { color: (p) => p.dataIndex >= 3 ? chartColors.cancel : p.dataIndex >= 2 ? '#ce93d8' : chartColors.internet },
      label: { show: true, position: 'top' },
    }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function CanStepProd({ data }) {
  const can = data.cancellation_inprogress || {};
  const sp = can.step_product_cross || {};
  const steps = Object.keys(sp).sort((a, b) => {
    const va = Object.values(sp[a] || {}).reduce((s, v) => s + v, 0);
    const vb = Object.values(sp[b] || {}).reduce((s, v) => s + v, 0);
    return vb - va;
  });
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['互联网专线', '千里眼'] },
    xAxis: { type: 'category', data: steps, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [
      { name: '互联网专线', type: 'bar', stack: 'total', data: steps.map(s => (sp[s] || {})['互联网专线'] || 0), itemStyle: { color: chartColors.internet } },
      { name: '千里眼', type: 'bar', stack: 'total', data: steps.map(s => (sp[s] || {})['千里眼'] || 0), itemStyle: { color: chartColors.qianliyan } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function CanMonthly({ data }) {
  const can = data.cancellation_inprogress || {};
  const mc = can.monthly_count || {};
  const months = Object.keys(mc).sort();
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: months.map(m => mc[m]), smooth: true, areaStyle: {}, itemStyle: { color: chartColors.cancel }, label: { show: true } }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

// Meizhou deep
function MzSteps({ data }) {
  const mz = data.cancellation_inprogress?.meizhou_deep || {};
  const steps = mz.steps || {};
  const entries = Object.entries(steps).sort((a, b) => b[1] - a[1]);
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(e => e[1]), itemStyle: { color: '#e53935' }, label: { show: true, position: 'top' } }],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function MzProd({ data }) {
  const mz = data.cancellation_inprogress?.meizhou_deep || {};
  const qlySteps = mz.qly_steps || {};
  const zlSteps = mz.zl_steps || {};
  const allSteps = [...new Set([...Object.keys(qlySteps), ...Object.keys(zlSteps)])];
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: [`千里眼(${mz['千里眼'] || 0})`, `专线(${mz['互联网专线'] || 0})`] },
    xAxis: { type: 'category', data: allSteps, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value' },
    series: [
      { name: `千里眼(${mz['千里眼'] || 0})`, type: 'bar', data: allSteps.map(s => qlySteps[s] || 0), itemStyle: { color: chartColors.qianliyan }, label: { show: true, position: 'top' } },
      { name: `专线(${mz['互联网专线'] || 0})`, type: 'bar', data: allSteps.map(s => zlSteps[s] || 0), itemStyle: { color: chartColors.internet }, label: { show: true, position: 'top' } },
    ],
  };
  return <ReactECharts option={option} style={{ height: 300 }} opts={defaultOpts} notMerge={notMerge} />;
}

function RiskCards({ data }) {
  const cs = data.city_stats || [];
  const meizhou = cs.find(c => c['地市'] === '梅州');
  const adj = data.adjustment_inprogress || {};
  const can = data.cancellation_inprogress || {};
  const si = data.step_inprogress || {};

  const adjStepDist = adj.step_distribution || {};
  const inprogEst = Math.round((data.overview?.total_in_progress || 0) * 0.67);
  const devChai = si['设备拆除'] || 0;
  const m6 = data.monthly_trend?.find(m => m['月份'] === '2026-06');
  const m7 = data.monthly_trend?.find(m => m['月份'] === '2026-07');

  const risks = [
    { cls: 'high', title: '🔴 梅州完成率极低', text: `梅州工单${meizhou?.total_orders || 0}单，仅完成${meizhou?.completed || 0}单，完成率${meizhou?.completion_rate || 0}%。${can.meizhou_deep?.total || 0}单销户在途（设备拆除为主）。` },
    { cls: 'high', title: '🔴 需求分析瓶颈', text: `调整在途${adj.total || 0}单中，${adjStepDist['需求分析'] || 0}单卡在需求分析环节。千里眼调整需求分析流程需审查。` },
    { cls: 'high', title: '🔴 千里眼产品积压', text: `千里眼在途${inprogEst}单（约67%），完成率远低于互联网专线。设备拆除${devChai}单全为千里眼。` },
    { cls: 'mid', title: '🟡 6-7月爆发增长', text: `6月${m6?.total_orders || 0}单、7月${m7?.total_orders || 0}单，派单量持续增长。在途压力加大。` },
  ];

  return risks.map((r, i) => (
    <div key={i} style={{
      borderRadius: 10, padding: 14,
      borderLeft: `4px solid ${r.cls === 'high' ? '#e53935' : '#fb8c00'}`,
      background: r.cls === 'high' ? '#fff5f5' : '#fff8e1',
    }}>
      <h4 style={{ fontSize: 13, margin: '0 0 6px' }}>{r.title}</h4>
      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, margin: 0 }}>{r.text}</p>
    </div>
  ));
}
