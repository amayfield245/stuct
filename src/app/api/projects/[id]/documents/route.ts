import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
// @ts-ignore
import pdfParse from 'pdf-parse'
// @ts-ignore
import mammoth from 'mammoth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads')
    try {
      await fs.access(uploadsDir)
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true })
    }

    const documents = []

    for (const file of files) {
      try {
        // Save file to disk
        const fileId = uuidv4()
        const fileName = `${fileId}_${file.name}`
        const filePath = path.join(uploadsDir, fileName)
        
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await fs.writeFile(filePath, buffer)

        // Extract text content based on file type
        let content = ''
        const fileType = path.extname(file.name).toLowerCase()

        switch (fileType) {
          case '.txt':
          case '.md':
            content = buffer.toString('utf-8')
            break
            
          case '.csv':
            content = buffer.toString('utf-8')
            break
            
          case '.pdf':
            try {
              const pdfData = await pdfParse(buffer)
              content = pdfData.text
            } catch (error) {
              console.error('PDF parsing error:', error)
              content = '[PDF content could not be extracted]'
            }
            break
            
          case '.docx':
            try {
              const result = await mammoth.extractRawText({ buffer })
              content = result.value
            } catch (error) {
              console.error('DOCX parsing error:', error)
              content = '[DOCX content could not be extracted]'
            }
            break
            
          default:
            content = '[Unsupported file format]'
        }

        // Save document to database
        const document = await prisma.document.create({
          data: {
            projectId: params.id,
            filename: file.name,
            fileType: fileType,
            fileSize: file.size,
            content: content,
            status: 'uploaded'
          }
        })

        documents.push({
          id: document.id,
          filename: document.filename,
          fileType: document.fileType,
          fileSize: document.fileSize,
          status: document.status,
          createdAt: document.createdAt.toISOString()
        })

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        // Continue with other files even if one fails
      }
    }

    return NextResponse.json({
      message: `Successfully uploaded ${documents.length} documents`,
      documents
    })

  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload documents' },
      { status: 500 }
    )
  }
}