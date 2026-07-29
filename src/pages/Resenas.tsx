import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, CheckCircle, LogIn, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Review } from '../types';
import StarRating from '../components/ui/StarRating';
import { useSEO } from '../hooks/useSEO';

const REVIEWS_PER_PAGE = 9;

export default function Resenas() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useSEO({
    title: 'Reseñas de Viajeros | Recorramos México',
    description:
      'Lee las opiniones y calificaciones de viajeros que han vivido la experiencia de viajar con Recorramos México. Comparte tu propia reseña y cuéntanos cómo fue tu aventura.',
    path: '/resenas',
    image: '/Logo_Bandera.jpg',
  });

  const loadReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*, tours(title_es)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (data) setReviews(data as Review[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0 ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = reviews.slice((currentPage - 1) * REVIEWS_PER_PAGE, currentPage * REVIEWS_PER_PAGE);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) {
      setSubmitError('Por favor escribe tu comentario.');
      return;
    }
    if (comment.trim().length < 10) {
      setSubmitError('Tu comentario debe tener al menos 10 caracteres.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    // Get the user's profile for name and contact info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle();

    const customerName = profile?.full_name || profile?.email || 'Viajero';

    const { error } = await supabase.from('reviews').insert({
      customer_name: customerName,
      rating,
      comment_es: comment.trim(),
      comment_en: comment.trim(),
      is_approved: false,
      email: profile?.email || user.email || null,
      phone: profile?.phone || null,
    });

    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSubmitSuccess(true);
    setComment('');
    setRating(5);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero */}
      <div className="bg-[#1A1A1A] py-14 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Reseñas de Viajeros</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Descubre lo que nuestros viajeros opinan sobre sus experiencias con nosotros.
            Tu opinión nos ayuda a mejorar y a inspirar a más personas a explorar México.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Summary + Form layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Rating Summary */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="text-center mb-6">
              <p className="text-5xl font-black text-gray-900">{avgRating}</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <StarRating rating={Math.round(Number(avgRating))} size={20} />
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Basado en {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
              </p>
            </div>
            <div className="space-y-2">
              {ratingCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 w-6">{star}</span>
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Form / Login prompt */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">¡Gracias por tu reseña!</h3>
                <p className="text-gray-500 text-sm max-w-md">
                  Tu opinión ha sido enviada y está en revisión. Una vez aprobada por nuestro equipo,
                  aparecerá en esta página para que otros viajeros la lean.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-6 px-6 py-2.5 bg-[#E8670A] text-white font-semibold rounded-xl hover:bg-[#B8520A] transition-colors"
                >
                  Escribir otra reseña
                </button>
              </div>
            ) : user ? (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#E8670A]/10 rounded-xl flex items-center justify-center">
                    <MessageSquare size={20} className="text-[#E8670A]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Comparte tu experiencia</h3>
                    <p className="text-gray-500 text-sm">Cuéntanos cómo fue tu viaje con nosotros</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Tu calificación
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="focus:outline-none transition-transform hover:scale-110"
                        >
                          <Star
                            size={32}
                            className={
                              star <= (hoverRating || rating)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-gray-300 fill-gray-300'
                            }
                          />
                        </button>
                      ))}
                      <span className="ml-3 text-sm font-semibold text-gray-600">
                        {rating}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Tu comentario
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe tu experiencia: el destino, el servicio, el guía, lo que más te gustó..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E8670A]/30 focus:border-[#E8670A] transition-colors resize-none"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/500</p>
                  </div>

                  {submitError && (
                    <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Star size={18} className="fill-white" />
                        Enviar reseña
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    Tu reseña será revisada por nuestro equipo antes de publicarse.
                  </p>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-[#E8670A]/10 rounded-full flex items-center justify-center mb-4">
                  <LogIn size={28} className="text-[#E8670A]" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Inicia sesión para dejar tu reseña</h3>
                <p className="text-gray-500 text-sm max-w-md mb-6">
                  Queremos escuchar sobre tu experiencia. Inicia sesión en tu cuenta para compartir
                  tu opinión y calificación con otros viajeros.
                </p>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-6 py-3 bg-[#E8670A] text-white font-bold rounded-xl hover:bg-[#B8520A] transition-colors"
                >
                  <LogIn size={18} />
                  Iniciar sesión
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <Quote size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aún no hay reseñas</h3>
            <p className="text-gray-500 text-sm">
              Sé el primero en compartir tu experiencia de viaje con Recorramos México.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#E8670A]/20 transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 bg-[#E8670A]/10 rounded-full flex items-center justify-center text-[#E8670A] font-bold text-base flex-shrink-0">
                      {review.customer_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{review.customer_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={review.rating} size={14} />
                        <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                    <Quote size={20} className="text-gray-200 flex-shrink-0" />
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-5">
                    "{review.comment_es}"
                  </p>
                  {review.tours && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Tour: <span className="font-semibold text-gray-600">{review.tours.title_es}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-[#E8670A] hover:text-[#E8670A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
                      currentPage === i + 1
                        ? 'bg-[#E8670A] text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-[#E8670A] hover:text-[#E8670A]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-[#E8670A] hover:text-[#E8670A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
