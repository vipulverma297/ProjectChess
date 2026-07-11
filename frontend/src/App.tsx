import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import Home from './pages/Home';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import AIGamePage from './pages/AIGamePage';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/lobby"   element={<LobbyPage />} />
          <Route path="/game/2d" element={<GamePage mode="2d" key="game-2d" />} />
          <Route path="/game/3d" element={<GamePage mode="3d" key="game-3d" />} />
          <Route path="/ai"      element={<AIGamePage mode="setup" key="ai-setup" />} />
          <Route path="/ai/2d"   element={<AIGamePage mode="2d" key="ai-2d" />} />
          <Route path="/ai/3d"   element={<AIGamePage mode="3d" key="ai-3d" />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
