import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import WhatsAppButton from './components/layout/WhatsAppButton';
import LoadingScreen from './components/layout/LoadingScreen';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute';
import { AuthProvider } from './hooks/useAuth';

const Home = lazy(() => import('./pages/Home'));
const Tours = lazy(() => import('./pages/Tours'));
const TourDetail = lazy(() => import('./pages/TourDetail'));
const Paquetes = lazy(() => import('./pages/Paquetes'));
const Nosotros = lazy(() => import('./pages/Nosotros'));
const Servicios = lazy(() => import('./pages/Servicios'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Resenas = lazy(() => import('./pages/Resenas'));
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
const AdminInquiries = lazy(() => import('./pages/admin/AdminInquiries'));
const AdminComunicados = lazy(() => import('./pages/admin/AdminComunicados'));
const AdminViajeros = lazy(() => import('./pages/admin/AdminViajeros'));
const AdminCategorias = lazy(() => import('./pages/admin/AdminCategorias'));
const AdminConfiguracion = lazy(() => import('./pages/admin/AdminConfiguracion'));
const Productos = lazy(() => import('./pages/Productos'));
const ProductoDetalle = lazy(() => import('./pages/ProductoDetalle'));
const AdminProductos = lazy(() => import('./pages/admin/AdminProductos'));
const AdminPedidos = lazy(() => import('./pages/admin/AdminPedidos'));
const ConfirmarPago = lazy(() => import('./pages/ConfirmarPago'));
const Privacidad = lazy(() => import('./pages/Privacidad'));
const Terminos = lazy(() => import('./pages/Terminos'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
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
          <Route path="/productos" element={<Productos />} />
          <Route path="/productos/:slug" element={<ProductoDetalle />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/resenas" element={<Resenas />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/confirmar-pago" element={<ConfirmarPago />} />
          <Route path="/privacidad" element={<Privacidad />} />
          <Route path="/terminos" element={<Terminos />} />

          {/* Traveler auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/recuperar-contrasena" element={<ResetPassword />} />
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
              <Route path="inquiries" element={<AdminInquiries />} />
              <Route path="comunicados" element={<AdminComunicados />} />
              <Route path="viajeros" element={<AdminViajeros />} />
              <Route path="categorias" element={<AdminCategorias />} />
              <Route path="productos" element={<AdminProductos />} />
              <Route path="pedidos" element={<AdminPedidos />} />
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
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
