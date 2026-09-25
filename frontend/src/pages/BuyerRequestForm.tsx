import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { buyerRequestsApi, BuyerRequestCreate } from '../lib/api';
import { Upload, X, Calendar, Tag, Clock, Image as ImageIcon, Mic, Send, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BuyerRequestForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [quantity, setQuantity] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(Array.from(files));
    }
  };

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const newAttachments = [...attachments, ...imageFiles];
    const newPreviews = [...previewImages];

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        setAttachments(newAttachments);
        setPreviewImages(newPreviews);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    setAttachments(newAttachments);
    setPreviewImages(newPreviews);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachments(prev => [...prev, audioFile]);
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error(t('buyerRequests micPermissionError', 'Microphone permission denied'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError(t('buyerRequests.formError', 'Please fill in all required fields'));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (category) formData.append('category', category);
      if (deadline) formData.append('deadline', deadline);
      if (maxBudget) formData.append('maxBudget', maxBudget);
      if (quantity) formData.append('quantity', quantity);

      attachments.forEach(attachment => formData.append('attachments', attachment));

      await buyerRequestsApi.create(formData as unknown as BuyerRequestCreate);
      toast.success(t('buyerRequests.created', 'Request created successfully'));
      navigate('/buyer/requests');
    } catch (err) {
      setError(t('buyerRequests.createFailed', 'Failed to create request'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/buyer/requests')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">{t('buyerRequests.newRequest', 'New Request')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('buyerRequests.title', 'Title')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('buyerRequests.titlePlaceholder', 'e.g., Handmade ceramic vase')}
              className="input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('buyerRequests.description', 'Description')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('buyerRequests.descriptionPlaceholder', 'Describe what you need...')}
              rows={5}
              className="input"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('buyerRequests.category', 'Category')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Ceramics', 'Textiles', 'Woodwork', 'Metalwork', 'Jewelry', 'Painting'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-2" />
                {t('buyerRequests.deadline', 'Deadline')}
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4 inline mr-2" />
                {t('buyerRequests.maxBudget', 'Max Budget (₹)')}
              </label>
              <input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                placeholder="10000"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="h-4 w-4 inline mr-2" />
                {t('buyerRequests.quantity', 'Quantity')}
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="input"
              />
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('buyerRequests.images', 'Images')}
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600">
                {t('buyerRequests.clickToUpload', 'Click to upload images')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t('buyerRequests.supportedFormats', 'Supports JPG, PNG, WEBP')}
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Attachment Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {previewImages.map((preview, index) => (
                <div key={index} className="relative group">
                  <img src={preview} className="w-full h-32 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('buyerRequests.voiceNote', 'Voice Note')}
            </label>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {isRecording ? (
                <>
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  {t('buyerRequests.stopRecording', 'Stop Recording')}
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5" />
                  {t('buyerRequests.startRecording', 'Start Recording')}
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loading className="w-5 h-5" />
            ) : (
              <>
                <Send className="h-5 w-5" />
                {t('buyerRequests.submitRequest', 'Submit Request')}
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
}
