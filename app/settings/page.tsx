'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Package, LogOut, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
);

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState((session?.user as any)?.credits || 0);
  const [planType, setPlanType] = useState(
    (session?.user as any)?.planType || 'FREE',
  );
  const [pollingForUpdate, setPollingForUpdate] = useState(false);

  // Update local state when session changes
  useEffect(() => {
    if (session?.user) {
      setCredits((session.user as any)?.credits || 0);
      setPlanType((session.user as any)?.planType || 'FREE');
    }
  }, [session]);

  // Poll for updates after successful checkout
  useEffect(() => {
    if (!pollingForUpdate) return;

    let pollCount = 0;
    const maxPolls = 20; // Poll for up to 20 seconds
    const pollInterval = 1000; // Poll every 1 second

    const intervalId = setInterval(async () => {
      pollCount++;

      // Update the session to get latest data
      const updatedSession = await updateSession();

      if (updatedSession?.user) {
        const updatedCredits = (updatedSession.user as any)?.credits || 0;
        const updatedPlan = (updatedSession.user as any)?.planType || 'FREE';

        // Check if the plan has been updated
        if (updatedPlan !== 'FREE' && updatedPlan !== planType) {
          setCredits(updatedCredits);
          setPlanType(updatedPlan);
          setPollingForUpdate(false);
          clearInterval(intervalId);
          toast.success(
            `Your account has been updated! You now have ${updatedCredits.toLocaleString()} credits.`,
          );
          return;
        }
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        setPollingForUpdate(false);
        clearInterval(intervalId);
      }
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollingForUpdate, updateSession, planType]);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const plan = params.get('plan') || 'subscription';
      const sessionId = params.get('session_id');

      toast.success(
        `Successfully subscribed to ${plan} plan! Updating your account...`,
      );

      // Start polling for updates
      setPollingForUpdate(true);

      // Also trigger immediate update
      updateSession();
      router.refresh();

      // Clean URL
      window.history.replaceState({}, '', '/settings');
    }
    if (params.get('canceled') === 'true') {
      toast.error('Checkout was canceled');
      window.history.replaceState({}, '', '/settings');
    }
  }, [router, updateSession]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="inline-block h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const handleCheckout = async (plan: 'BASIC' | 'PRO') => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
      toast.error('Stripe is not configured');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const { sessionId } = await response.json();

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }

      toast.success('Redirecting to checkout...');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create billing portal');
      }

      if (data.url) {
        toast.success('Opening billing portal...');
        // Redirect to portal
        window.location.href = data.url;
        // On return, Stripe redirects back to /settings and we'll refresh
      } else {
        throw new Error('No billing portal URL received');
      }
    } catch (error: any) {
      console.error('Billing portal error:', error);
      toast.error(error.message || 'Failed to open billing portal');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">Back</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your subscription and credits</p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Current Status
          </h2>
          {pollingForUpdate && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-800">
                Updating your account with new credits...
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Credits</p>
              <p className="text-2xl font-bold text-blue-600">
                {credits.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Plan</p>
              <p className="text-2xl font-bold text-gray-900">{planType}</p>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Subscription Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Plan */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Basic Plan
                </h3>
              </div>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-800">$10</p>
                <p className="text-sm text-gray-600">10,000 credits</p>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-700">
                <li>✓ 10,000 credits included</li>
                <li>✓ 100 scrapes</li>
                <li>✓ Email support</li>
              </ul>
              <button
                onClick={() => handleCheckout('BASIC')}
                disabled={loading || planType !== 'FREE'}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                ) : (
                  'Subscribe to Basic Plan'
                )}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-lg shadow border-2 border-blue-500 p-6 relative">
              <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 rounded-bl-lg text-xs font-medium">
                POPULAR
              </div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Pro Plan
                </h3>
              </div>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-800">$20</p>
                <p className="text-sm text-gray-600">20,000 credits</p>
              </div>
              <ul className="space-y-2 mb-6 text-sm text-gray-700">
                <li>✓ 20,000 credits included</li>
                <li>✓ 200 scrapes</li>
                <li>✓ Priority support</li>
                <li>✓ Advanced features</li>
              </ul>
              <button
                onClick={() => handleCheckout('PRO')}
                disabled={
                  loading || (planType !== 'FREE' && planType !== 'BASIC')
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                ) : planType === 'BASIC' ? (
                  'Upgrade to Pro Plan'
                ) : (
                  'Subscribe to Pro Plan'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Billing Management */}
        {(planType === 'BASIC' || planType === 'PRO') && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Billing Management
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage your subscription, update payment methods, and view
              invoices.
            </p>
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 inline-block animate-spin" />
              ) : (
                'Manage Billing'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
