import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileTextOutlined,
  OrderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  EditOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  BuildOutlined,
  ProjectOutlined,
  SyncOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  MonitorOutlined,
} from '@ant-design/icons';
import { getUser, clearAuth, isAdmin } from './api/auth';
import RequirementList from './pages/RequirementList';
import WorkOrderList from './pages/WorkOrderList';
import StatisticsPage from './pages/StatisticsPage';
import ProjectStatisticsPage from './pages/ProjectStatisticsPage';
import FullcycleStatisticsPage from './pages/FullcycleStatisticsPage';
import HistoricalWorkOrderList from './pages/HistoricalWorkOrderList';
import OnlineRateStatistics from './pages/OnlineRateStatistics';
import ManagedList from './pages/ManagedList';
import LoginPage from './pages/LoginPage';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/requirements',
    icon: <FileTextOutlined />,
    label: '需求管理',
  },
  {
    key: 'statistics-group',
    icon: <BarChartOutlined />,
    label: '统计分析',
    children: [
      {
        key: '/statistics/fullcycle',
        icon: <SyncOutlined />,
        label: '全周期统计分析',
      },
      {
        key: '/statistics/operations',
        icon: <ProjectOutlined />,
        label: '运营期统计分析',
      },
      {
        key: '/statistics/construction',
        icon: <BuildOutlined />,
        label: '建设期统计分析',
      },
    ],
  },
  {
    key: 'work-orders-group',
    icon: <OrderedListOutlined />,
    label: '运营期工单管理',
    children: [
      {
        key: '/work-orders/open',
        icon: <CheckCircleOutlined />,
        label: '开通工单管理',
      },
      {
        key: '/work-orders/adjust',
        icon: <EditOutlined />,
        label: '调整工单管理',
      },
      {
        key: '/work-orders/cancel',
        icon: <CloseCircleOutlined />,
        label: '取消工单管理',
      },
    ],
  },
  {
    key: '/historical-work-orders',
    icon: <OrderedListOutlined />,
    label: '历史工单信息',
  },
  {
    key: 'online-rate-group',
    icon: <MonitorOutlined />,
    label: '在线率管理',
    children: [
      {
        key: '/online-rate/statistics',
        icon: <DashboardOutlined />,
        label: '在线率统计分析',
      },
      {
        key: '/online-rate/managed-list',
        icon: <DatabaseOutlined />,
        label: '纳管清单信息',
      },
    ],
  },
];

// 扁平化获取所有子菜单key
const allMenuKeys = ['/requirements', '/historical-work-orders', '/statistics/fullcycle', '/statistics/operations', '/statistics/construction', '/work-orders/open', '/work-orders/adjust', '/work-orders/cancel', '/online-rate/statistics', '/online-rate/managed-list'];

// 路由守卫
function ProtectedRoute({ children }) {
  const user = getUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

const pageTitles = {
  '/requirements': '需求管理',
  '/historical-work-orders': '历史工单信息',
  '/statistics/fullcycle': '全周期统计分析',
  '/statistics/operations': '运营期统计分析',
  '/statistics/construction': '建设期统计分析',
  '/work-orders/open': '开通工单管理',
  '/work-orders/adjust': '调整工单管理',
  '/work-orders/cancel': '取消工单管理',
  '/online-rate/statistics': '在线率统计分析',
  '/online-rate/managed-list': '纳管清单信息',
};

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'role',
        label: `角色: ${user?.role === 'admin' ? '管理员' : '普通用户'}`,
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  };

  // 当前页面路径，如果匹配到子菜单则选中子菜单
  const selectedKey = allMenuKeys.includes(location.pathname)
    ? location.pathname
    : '/work-orders/open';
  // 自动展开工单管理、统计分析和在线率管理父菜单
  const openKeys = [];
  if (location.pathname.startsWith('/work-orders')) openKeys.push('work-orders-group');
  if (location.pathname.startsWith('/statistics')) openKeys.push('statistics-group');
  if (location.pathname.startsWith('/online-rate')) openKeys.push('online-rate-group');

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider width={200} style={{ overflow: 'auto' }}>
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          FC项目交互支撑系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['work-orders-group', 'statistics-group', 'online-rate-group']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ overflow: 'hidden' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>
            {pageTitles[location.pathname] || '工单管理'}
          </span>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Button type="text" icon={<UserOutlined />}>
              {user?.display_name || user?.username}
            </Button>
          </Dropdown>
        </Header>
        <Content id="content-scroll" style={{ margin: '0 24px 24px', background: '#fff', padding: '0 24px 16px', borderRadius: 8, overflow: 'auto', flex: 1 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/requirements" replace />} />
            <Route path="/requirements" element={<RequirementList />} />
            <Route path="/historical-work-orders" element={<HistoricalWorkOrderList isAdmin={isAdmin()} />} />
            <Route path="/statistics/operations" element={<StatisticsPage />} />
            <Route path="/statistics/construction" element={<ProjectStatisticsPage />} />
            <Route path="/statistics/fullcycle" element={<FullcycleStatisticsPage />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/statistics" element={<Navigate to="/statistics/operations" replace />} />
            <Route path="/work-orders/open" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务开通" pageTitle="开通工单管理" />} />
            <Route path="/work-orders/adjust" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务调整" pageTitle="调整工单管理" />} />
            <Route path="/work-orders/cancel" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务取消" pageTitle="取消工单管理" />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/work-orders" element={<Navigate to="/work-orders/open" replace />} />
            <Route path="/online-rate/statistics" element={<OnlineRateStatistics />} />
            <Route path="/online-rate/managed-list" element={<ManagedList />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
