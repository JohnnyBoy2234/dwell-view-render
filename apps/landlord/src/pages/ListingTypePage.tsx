import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function ListingTypePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const go = (base: string) =>
    navigate(propertyId ? `${base}?propertyId=${propertyId}` : base);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-ios-gray-light via-white to-ios-gray-light pt-10 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">What do you want to do?</h1>
          <p className="text-sm text-gray-500 mb-6">Choose how you want to add your property</p>

          {/* List for Rent */}
          <button
            onClick={() => go('/list-property')}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 mb-3 border-2 border-blue-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🏠
            </div>
            <div className="flex-1">
              <div className="font-bold text-blue-800 text-base">List for Rent</div>
              <div className="text-sm text-gray-500 mt-0.5">Publish your property to find tenants</div>
            </div>
            <span className="text-blue-300 text-xl">›</span>
          </button>

          {/* List for Sale */}
          <button
            onClick={() => go('/list-sale')}
            className="w-full flex items-center gap-4 bg-white rounded-2xl p-5 mb-3 border-2 border-green-200 shadow-sm hover:border-green-400 hover:shadow-md transition-all text-left"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              🏷️
            </div>
            <div className="flex-1">
              <div className="font-bold text-green-800 text-base">List for Sale</div>
              <div className="text-sm text-gray-500 mt-0.5">Publish your property to find buyers</div>
            </div>
            <span className="text-green-300 text-xl">›</span>
          </button>

          {/* Commercial Property — coming soon (disabled) */}
          <div
            aria-disabled="true"
            className="w-full flex items-center gap-4 bg-white/70 rounded-2xl p-5 mb-3 border-2 border-dashed border-gray-200 text-left cursor-not-allowed select-none"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 opacity-60">
              🏢
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-500 text-base">Commercial Property</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                  Coming Soon
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-0.5">Offices, retail &amp; industrial — launching soon</div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
