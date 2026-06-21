import React from 'react';
import { Layout, Button, Space, Avatar, Tag, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, ProjectOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { UserRole } from '../types';

const roleMap: Record<UserRole, { label: string; color: string }> = {
  ACCOUNT_MANAGER: { label: '客户经理', color: 'blue' },
  DESIGNER: { label: '设计师', color: 'purple' },
  CLIENT: { label: '客户', color: 'green' },
};

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Layout.Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#001529',
        padding: '0 24px',
      }}
    >
      <Space size={12} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <ProjectOutlined style={{ color: '#fff', fontSize: 24 }} />
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          广告项目管理系统
        </Typography.Title>
      </Space>
      <Space size={16}>
        <Avatar icon={<UserOutlined />} />
        <Space direction="vertical" size={0}>
          <span style={{ color: '#fff', fontSize: 14 }}>{user?.name}</span>
          <Tag color={roleMap[user!.role].color} style={{ margin: 0 }}>
            {roleMap[user!.role].label}
          </Tag>
        </Space>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          style={{ color: '#fff' }}
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          退出
        </Button>
      </Space>
    </Layout.Header>
  );
}
