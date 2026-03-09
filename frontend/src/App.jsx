import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zen-dark text-zen-light font-sans">
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col items-center justify-center min-h-screen">
              <h1 className="text-4xl font-bold text-zen-cyan mb-4">ZencampuZ</h1>
              <p className="text-zen-slateLight text-lg">Intelligent Campus OS</p>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
