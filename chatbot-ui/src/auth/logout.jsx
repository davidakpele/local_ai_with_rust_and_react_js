import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import appManager from '../utils/appManager';


const Logout = () => {

  const navigate = useNavigate();

  useEffect(() => {
    appManager.clearAll();
    navigate('/auth/login');
  }, [navigate]);
  appManager.clear({ keys: ['token'], type: 'local' });
  return true;
}

export default Logout