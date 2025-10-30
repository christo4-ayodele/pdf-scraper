"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { LogOut, User, FileText, Zap, Shield } from "lucide-react"
import UploadComponent from "@/components/UploadComponent"
import ResumeList from "@/components/ResumeList"
import Link from "next/link"

export default function Home() {
  const { data: session, status, update: updateSession } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1)
    // Update the session to refresh credits in real-time
    updateSession()
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">PDF Scraper</h1>
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/signin"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 mb-4">
              Extract Structured Data from PDF Resumes
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Powered by OpenAI GPT-4o • Fast • Accurate • Secure
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            >
              Get Started Free
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              1,000 free credits (10 extractions) for new users
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Zap className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-black">AI-Powered</h3>
              <p className="text-gray-600">
                Uses OpenAI GPT-4o to extract structured data from resumes with high accuracy.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <FileText className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-black">Structured Output</h3>
              <p className="text-gray-600">
                Gets profile, work experience, education, skills, and more in JSON format.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-black">Secure & Private</h3>
              <p className="text-gray-600">
                Your data is encrypted and stored securely. We never share your information.
              </p>
            </div>
          </div>

          {/* Preview of Upload Interface */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-semibold mb-4 text-black">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-black">Upload Your PDF</h4>
                  <p className="text-gray-600">Drag and drop your resume PDF file (up to 10MB)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-black">AI Processing</h4>
                  <p className="text-gray-600">Our AI extracts structured data using OpenAI in 10-30 seconds</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1 text-black">View Results</h4>
                  <p className="text-gray-600">See your extracted resume data in a beautiful, organized format</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Ready to extract your resume data?
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
            >
              Sign Up for Free
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">PDF Scraper</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {session.user?.email}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Credits:</span>
                <span className="font-semibold text-blue-600">
                  {session.user?.credits || 0}
                </span>
              </div>

              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <User className="w-4 h-4" />
                Settings
              </Link>

              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <UploadComponent onUploadComplete={handleUploadComplete} />
        </div>

        <div className="mb-8">
          <ResumeList key={refreshKey} />
        </div>
      </main>
    </div>
  )
}
