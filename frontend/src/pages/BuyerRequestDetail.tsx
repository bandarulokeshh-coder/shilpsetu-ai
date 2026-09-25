import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { buyerRequestsApi, quotesApi, conversationsApi, BuyerRequest, Quote, Conversation } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { ChevronLeft, Calendar, MapPin, Tag, Clock, MessageCircle, Send, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';

export default function BuyerRequestDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [request, setRequest] = useState<BuyerRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      const [requestRes, quotesRes, conversationsRes] = await Promise.all([
        buyerRequestsApi.getById(id!),
        quotesApi.getByRequest(id!),
        conversationsApi.getByRequest(id!),
      ]);
      setRequest(requestRes.data);
      setQuotes(quotesRes.data);
      setConversations(conversationsRes.data);
    } catch (error) {
      toast.error(t('buyerRequests.loadFailed', 'Failed to load request'));
      navigate('/buyer/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleFindArtisans = async () => {
    setMatching(true);
    try {
      const response = await buyerRequestsApi.matchArtisan(id!);
      const found = response.data.matches.length;
      toast.success(
        found > 0
          ? t('buyerRequests.matchedFound', 'Found {{count}} matching artisan(s)', { count: found })
          : t('buyerRequests.noMatches', 'No artisans matched this request yet')
      );
      loadRequest();
    } catch (error) {
      toast.error(t('buyerRequests.matchFailed', 'Failed to find matching artisans'));
    } finally {
      setMatching(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // When the buyer views their own request, message the matched artisan if there is one;
      // artisans always reply to the buyer.
      const receiverId =
        request!.buyerId === user?.id && request!.matchedArtisan
          ? request!.matchedArtisan.id
          : request!.buyerId;

      await conversationsApi.create({
        buyerRequestId: id!,
        receiverId,
        message,
        attachments: attachment ? [attachment] : undefined,
      });
      setMessage('');
      setAttachment(null);
      loadRequest();
      toast.success(t('buyerRequests.messageSent', 'Message sent'));
    } catch (error) {
      toast.error(t('buyerRequests.messageFailed', 'Failed to send message'));
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      await quotesApi.accept(quoteId);
      toast.success(t('buyerRequests.quoteAccepted', 'Quote accepted'));
      loadRequest();
    } catch (error) {
      toast.error(t('buyerRequests.acceptFailed', 'Failed to accept quote'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'MATCHED':
        return 'bg-blue-100 text-blue-800';
      case 'QUOTED':
      case 'QUOTE_RECEIVED':
        return 'bg-purple-100 text-purple-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <Loading>{t('common.loading', 'Loading...')}</Loading>;
  }

  if (!request) {
    return (
      <EmptyState
        title={t('buyerRequests.notFound', 'Request not found')}
        action={
          <Link to="/buyer/requests" className="btn-primary">
            {t('buyerRequests.backToRequests', 'Back to Requests')}
          </Link>
        }
      />
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link to="/buyer/requests" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ChevronLeft className="h-4 w-4" />
          {t('common.back', 'Back')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <div className="card">
              <div className="flex justify-between items-start mb-4 gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                  {t(`buyerRequests.status.${request.status}`, request.status)}
                </span>
                <div className="flex items-center gap-3">
                  {request.matchedArtisan && (
                    <span className="text-sm text-blue-600 font-medium">
                      {t('buyerRequests.matched', 'Matched')}
                    </span>
                  )}
                  {request.buyerId === user?.id && ['PENDING', 'MATCHED'].includes(request.status) && (
                    <button
                      type="button"
                      onClick={handleFindArtisans}
                      disabled={matching}
                      className="btn-outline text-sm flex items-center gap-1"
                    >
                      {matching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {matching
                        ? t('buyerRequests.matching', 'Matching…')
                        : t('buyerRequests.findArtisans', 'Find Artisans')}
                    </button>
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold mb-4">{request.title}</h1>

              <div className="prose max-w-none text-gray-700 mb-6">
                <p>{request.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {request.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span>{request.category}</span>
                  </div>
                )}
                {request.deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(request.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                {request.maxBudget && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Budget: {formatCurrency(request.maxBudget)}</span>
                  </div>
                )}
                {request.quantity && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Quantity: {request.quantity}</span>
                  </div>
                )}
                {request.matchedArtisan && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{request.matchedArtisan.name}</span>
                  </div>
                )}
              </div>

              {request.attachments && request.attachments.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">{t('buyerRequests.images', 'Images')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {request.attachments.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Attachment ${idx}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI-suggested artisans */}
            {request.artisanMatches && request.artisanMatches.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-600" />
                  {t('buyerRequests.suggestedArtisans', 'Suggested artisans')}
                </h3>
                <div className="space-y-2">
                  {request.artisanMatches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {match.artisan?.name}
                          {match.artisan?.craftType ? ` · ${match.artisan.craftType}` : ''}
                        </p>
                        {match.matchReason && (
                          <p className="text-xs text-gray-500 truncate">{match.matchReason}</p>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 shrink-0">
                        {match.matchScore} {t('buyerRequests.points', 'pts')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quotes */}
            {quotes.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">{t('buyerRequests.quotes', 'Quotes')}</h2>
                <div className="space-y-4">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            quote.status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                            quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {t(`buyerRequests.status.${quote.status}`, quote.status)}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(quote.amount)}</span>
                      </div>

                      <p className="text-gray-700 mb-3">{quote.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        {quote.deadline && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(quote.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {quote.status === 'PENDING' && (
                        <button
                          onClick={() => handleAcceptQuote(quote.id)}
                          className="btn-primary text-sm"
                        >
                          {t('buyerRequests.acceptQuote', 'Accept Quote')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Communication */}
          <div className="space-y-6">
            {/* Chat */}
            <div className="card h-96 flex flex-col">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t('buyerRequests.communication', 'Communication')}
              </h2>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('buyerRequests.noMessages', 'No messages yet')}
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div key={conv.id} className={`flex ${conv.senderId === request.buyerId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        conv.senderId === request.buyerId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{conv.message}</p>
                        {conv.attachments && conv.attachments.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {conv.attachments.map((att, idx) => (
                              <img key={idx} src={att} className="w-12 h-12 rounded object-cover" />
                            ))}
                          </div>
                        )}
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {formatDistance(new Date(conv.createdAt), new Date(), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('buyerRequests.typeMessage', 'Type a message...')}
                    className="input flex-1"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
                    className="hidden"
                    id="attachment"
                  />
                  <label htmlFor="attachment" className="btn-outline px-3">
                    <ImageIcon className="h-5 w-5" />
                  </label>
                </div>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  {t('buyerRequests.send', 'Send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
