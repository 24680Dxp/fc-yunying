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
} from '@ant-design/icons';
import { getUser, clearAuth, isAdmin } from './api/auth';
import RequirementList from './pages/RequirementList';
import WorkOrderList from './pages/WorkOrderList';
import StatisticsPage from './pages/StatisticsPage';
import LoginPage from './pages/LoginPage';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/requirements',
    icon: <FileTextOutlined />,
    label: '需求管理',
  },
  {
    key: '/statistics',
    icon: <BarChartOutlined />,
    label: '统计分析',
  },
  {
    key: 'work-orders-group',
    icon: <OrderedListOutlined />,
    label: '工单管理',
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
];

// 扁平化获取所有子菜单key
const allMenuKeys = ['/requirements', '/statistics', '/work-orders/open', '/work-orders/adjust', '/work-orders/cancel'];

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
  '/statistics': '统计分析',
  '/work-orders/open': '开通工单管理',
  '/work-orders/adjust': '调整工单管理',
  '/work-orders/cancel': '取消工单管理',
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
  // 自动展开工单管理父菜单
  const openKeys = location.pathname.startsWith('/work-orders') ? ['work-orders-group'] : [];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
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
          福彩项目运营管理系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={['work-orders-group']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
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
        <Content style={{ margin: 24, background: '#fff', padding: 24, borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/requirements" replace />} />
            <Route path="/requirements" element={<RequirementList />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/work-orders/open" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务开通" pageTitle="开通工单管理" />} />
            <Route path="/work-orders/adjust" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务调整" pageTitle="调整工单管理" />} />
            <Route path="/work-orders/cancel" element={<WorkOrderList isAdmin={isAdmin()} operationType="业务取消" pageTitle="取消工单管理" />} />
            {/* 旧路由兼容重定向 */}
            <Route path="/work-orders" element={<Navigate to="/work-orders/open" replace />} />
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
