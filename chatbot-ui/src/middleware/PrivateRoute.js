import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('ollama_data');
  
  return isAuthenticated ? children : <Navigate to="/auth/login" />;
};

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;