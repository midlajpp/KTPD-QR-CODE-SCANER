import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MemberFormModal from './MemberFormModal';

const Layout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleMemberCreated = () => {
    setIsAddModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="app-layout">
      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />
      <div className="main-wrapper">
        <Navbar
          onOpenMobile={() => setIsMobileOpen(true)}
          onOpenAddMember={() => setIsAddModalOpen(true)}
        />
        <main className="page-container">
          <Outlet context={{ refreshTrigger, openAddModal: () => setIsAddModalOpen(true) }} />
        </main>
      </div>

      <MemberFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={handleMemberCreated}
      />
    </div>
  );
};

export default Layout;

