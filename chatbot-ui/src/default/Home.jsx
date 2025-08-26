import React from 'react';
import styled from 'styled-components';
import Chatbot from '../components/Chatbot';

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
`;

function Home() {
  return (
    <AppContainer>
      <Chatbot />
    </AppContainer>
  );
}

export default Home;