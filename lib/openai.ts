import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ExtractedResumeData {
  profile: {
    name?: string
    surname?: string
    email?: string
    headline?: string
    professionalSummary?: string
    linkedIn?: string
    website?: string
    country?: string
    city?: string
    relocation?: boolean
    remote?: boolean
  }
  workExperiences: Array<{
    jobTitle?: string
    employmentType?: "FULL_TIME" | "PART_TIME" | "INTERNSHIP" | "CONTRACT"
    locationType?: "ONSITE" | "REMOTE" | "HYBRID"
    company?: string
    startMonth?: number
    startYear?: number
    endMonth?: number | null
    endYear?: number | null
    current?: boolean
    description?: string
  }>
  educations: Array<{
    school?: string
    degree?: "HIGH_SCHOOL" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "DOCTORATE"
    major?: string
    startYear?: number
    endYear?: number
    current?: boolean
    description?: string
  }>
  skills: string[]
  licenses: Array<{
    name?: string
    issuer?: string
    issueYear?: number
    description?: string
  }>
  languages: Array<{
    language?: string
    level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "NATIVE"
  }>
  achievements: Array<{
    title?: string
    organization?: string
    achieveDate?: string
    description?: string
  }>
  publications: Array<{
    title?: string
    publisher?: string
    publicationDate?: string
    publicationUrl?: string
    description?: string
  }>
  honors: Array<{
    title?: string
    issuer?: string
    issueMonth?: number
    issueYear?: number
    description?: string
  }>
}

const RESUME_EXTRACTION_PROMPT = `You are an expert at extracting structured data from resumes. Extract all information from the following resume text and return it as a JSON object matching this exact schema:

{
  "profile": {
    "name": "string",
    "surname": "string",
    "email": "string",
    "headline": "string",
    "professionalSummary": "string",
    "linkedIn": "string (URL)",
    "website": "string (URL)",
    "country": "string",
    "city": "string",
    "relocation": "boolean",
    "remote": "boolean"
  },
  "workExperiences": [
    {
      "jobTitle": "string",
      "employmentType": "FULL_TIME | PART_TIME | INTERNSHIP | CONTRACT",
      "locationType": "ONSITE | REMOTE | HYBRID",
      "company": "string",
      "startMonth": "number (1-12)",
      "startYear": "number",
      "endMonth": "number (1-12) or null",
      "endYear": "number or null",
      "current": "boolean",
      "description": "string"
    }
  ],
  "educations": [
    {
      "school": "string",
      "degree": "HIGH_SCHOOL | ASSOCIATE | BACHELOR | MASTER | DOCTORATE",
      "major": "string",
      "startYear": "number",
      "endYear": "number",
      "current": "boolean",
      "description": "string"
    }
  ],
  "skills": ["string"],
  "licenses": [
    {
      "name": "string",
      "issuer": "string",
      "issueYear": "number",
      "description": "string"
    }
  ],
  "languages": [
    {
      "language": "string",
      "level": "BEGINNER | INTERMEDIATE | ADVANCED | NATIVE"
    }
  ],
  "achievements": [
    {
      "title": "string",
      "organization": "string",
      "achieveDate": "string (YYYY-MM format)",
      "description": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string",
      "publicationDate": "string (ISO 8601 format)",
      "publicationUrl": "string (URL)",
      "description": "string"
    }
  ],
  "honors": [
    {
      "title": "string",
      "issuer": "string",
      "issueMonth": "number (1-12)",
      "issueYear": "number",
      "description": "string"
    }
  ]
}

Important rules:
- Return ONLY valid JSON, no markdown formatting
- Use null for missing optional fields
- Include empty arrays [] if no data is found
- Extract as much information as possible
- Use appropriate enums for employmentType, locationType, degree, and level fields
- Dates should be in the correct format
- If information is not available, use null or empty string

Resume text:
`

export async function extractResumeData(text: string): Promise<ExtractedResumeData> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a resume data extraction expert. Extract structured data from resumes and return only valid JSON without markdown formatting.",
        },
        {
          role: "user",
          content: RESUME_EXTRACTION_PROMPT + text,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error("No response from OpenAI")
    }

    // Remove any markdown code blocks if present
    const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "")
    
    const data = JSON.parse(cleanedContent) as ExtractedResumeData
    return data
  } catch (error) {
    console.error("OpenAI extraction error:", error)
    throw new Error("Failed to extract resume data")
  }
}

