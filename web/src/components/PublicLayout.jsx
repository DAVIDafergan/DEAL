import { Outlet } from 'react-router-dom';
import { Header } from './Header.jsx';

export function PublicLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
