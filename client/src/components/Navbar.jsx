import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const active = (path) => (location.pathname === path ? { fontWeight: 700 } : {});
  return (
    <nav style={{ background:'#fff', borderBottom:'1px solid #e1e6f5', padding:'10px 16px', marginBottom:16 }}>
      <div style={{ display:'flex', gap:16 }}>
        <Link to="/dashboard" style={active('/dashboard')}>Dashboard</Link>
        <Link to="/emi-calculator" style={active('/emi-calculator')}>EMI Calculator</Link>
      </div>
    </nav>
  );
};

export default Navbar;