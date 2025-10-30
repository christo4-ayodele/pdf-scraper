"use client"

import { useEffect, useState } from "react"
import { FileText, Calendar, Loader2 } from "lucide-react"

interface ResumeData {
  profile: any
  workExperiences: any[]
  educations: any[]
  skills: string[]
  licenses: any[]
  languages: any[]
  achievements: any[]
  publications: any[]
  honors: any[]
}

interface Resume {
  id: string
  fileName: string
  uploadedAt: string
  resumeData: ResumeData | null
}

export default function ResumeList() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)

  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resumes")
      const data = await response.json()
      setResumes(data.resumes || [])
    } catch (error) {
      console.error("Error fetching resumes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResumes()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p>No resumes uploaded yet. Upload your first PDF to get started!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4 text-black">Upload History</h2>
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedResume?.id === resume.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => setSelectedResume(resume)}
          >
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-black truncate">{resume.fileName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(resume.uploadedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-6 bg-gray-50 max-h-[600px] overflow-y-auto">
        {selectedResume ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-black">Extracted Data</h3>
              <p className="text-sm text-black">{selectedResume.fileName}</p>
            </div>

            {selectedResume.resumeData && (
              <>
                {selectedResume.resumeData.profile && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Profile</h4>
                    <div className="bg-white rounded p-3 space-y-1 text-sm text-black">
                      {selectedResume.resumeData.profile.name && (
                        <p><span className="font-medium">Name:</span> {selectedResume.resumeData.profile.name} {selectedResume.resumeData.profile.surname}</p>
                      )}
                      {selectedResume.resumeData.profile.email && (
                        <p><span className="font-medium">Email:</span> {selectedResume.resumeData.profile.email}</p>
                      )}
                      {selectedResume.resumeData.profile.headline && (
                        <p><span className="font-medium">Headline:</span> {selectedResume.resumeData.profile.headline}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedResume.resumeData.workExperiences && selectedResume.resumeData.workExperiences.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Work Experience</h4>
                    <div className="space-y-3">
                      {selectedResume.resumeData.workExperiences.map((exp: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 text-sm">
                          <p className="font-medium text-black">{exp.jobTitle}</p>
                          <p className="text-black">{exp.company}</p>
                          {exp.description && <p className="text-black mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResume.resumeData.skills && selectedResume.resumeData.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedResume.resumeData.skills.map((skill: string, idx: number) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResume.resumeData.educations && selectedResume.resumeData.educations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-black mb-2">Education</h4>
                    <div className="space-y-2">
                      {selectedResume.resumeData.educations.map((edu: any, idx: number) => (
                        <div key={idx} className="bg-white rounded p-3 text-sm">
                          <p className="font-medium text-black">{edu.degree} in {edu.major}</p>
                          <p className="text-black">{edu.school}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>Select a resume to view extracted data</p>
          </div>
        )}
      </div>
    </div>
  )
}

