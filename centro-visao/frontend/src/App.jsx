import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Exceptions from './pages/Exceptions.jsx';
import Cameras from './pages/Cameras.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/excecoes" element={<Exceptions />} />
        <Route path="/excecoes/:id" element={<Exceptions />} />
        <Route path="/cameras" element={<Cameras />} />
      </Routes>
    </Layout>
  );
}
