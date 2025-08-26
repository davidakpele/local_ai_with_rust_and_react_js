import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from '../auth/login';
import Register from '../auth/register';
import Home from '../default/Home';
import PrivateRoute from '../middleware/PrivateRoute';
import PublicRoute from '../middleware/PublicRoute';
import Logout from '../auth/logout';

function App() {

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<PrivateRoute><Home/></PrivateRoute>}/>
          <Route path="*" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/auth/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/login" element={<PublicRoute><Login /> </PublicRoute>} />
          <Route path="/logout" element={<PrivateRoute><Logout /> </PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;