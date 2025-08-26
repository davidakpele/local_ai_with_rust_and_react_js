import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';

const PublicRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('ollama_data');

  return isAuthenticated ? <Navigate to="/" /> : children;
};

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
export default PublicRoute;