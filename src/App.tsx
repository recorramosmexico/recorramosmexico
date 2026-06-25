import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/layout/WhatsAppButton';
import LoadingScreen from './components/layout/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';

const Home = lazy(() => import('./pages/Home'));
const Tours = lazy(() => import('./pages/Tours'));
const TourDetail = lazy(() => import('./pages/TourDetail'));
const Paquetes = lazy(() => import('./pages/Paquetes'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Servicios = lazy(() => import('./pages/Servicios'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Contacto = lazy(() => import('./pages/Contacto'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const MiCuenta = lazy(() => import('./pages/MiCuenta'));
const Success = lazy(() => import('./pages/Success'));
const Cancel = lazy(() => import('./pages/Cancel'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminTours = lazy(() => import('./pages/admin/AdminTours'));
const AdminReservaciones = lazy(() => import('./pages/admin/AdminReservaciones'));
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'));
const AdminResenas = lazy(() => import('./pages/admin/AdminResenas'));
const AdminCategorias = lazy(() => import('./pages/admin/AdminCategorias'));
const AdminConfiguracion = lazy(() => import('./pages/admin/AdminConfiguracion'));

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Header />}
      {!isAdmin && <WhatsAppButton />}
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/tours" element={<Tours />} />
          <Route path="/tours/:slug" element={<TourDetail />} />
          <Route path="/paquetes" element={<Paquetes />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Traveler auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/mi-cuenta"
            element={
              <ProtectedRoute>
                <MiCuenta />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route path="/admin">
            <Route index element={<AdminLogin />} />
            <Route
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tours" element={<AdminTours />} />
              <Route path="reservaciones" element={<AdminReservaciones />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="resenas" element={<AdminResenas />} />
              <Route path="categorias" element={<AdminCategorias />} />
              <Route path="configuracion" element={<AdminConfiguracion />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      {!isAdmin && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
