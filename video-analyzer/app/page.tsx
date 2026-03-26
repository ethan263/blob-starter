'use client'

import { useState, useRef } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [contentType, setContentType] = useState('movie')
  const [episodeNumber, setEpisodeNumber] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert('Please select a video file.')
      return
    }

    setIsUploading(true)
    try {
      // 1. Get Signed URL from our Next.js API
      const urlRes = await fetch('/api/gcs-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      })
      
      if (!urlRes.ok) {
        const errData = await urlRes.json()
        throw new Error(errData.error || 'Failed to get upload URL')
      }
      
      const { uploadUrl, publicUrl } = await urlRes.json()

      // 2. Upload file directly to Google Cloud Storage using the Signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload video to Google Cloud Storage')
      }

      // 3. Send Metadata + Video URL to n8n Webhook
      const n8nRes = await fetch('/api/n8n-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          contentType,
          episodeNumber,
          videoUrl: publicUrl
        })
      })

      if (!n8nRes.ok) {
        const errData = await n8nRes.json()
        throw new Error(errData.error || 'Failed to trigger n8n automation')
      }
      
      alert(`File uploaded successfully and automation triggered!`)
      
      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setContentType('movie')
      setEpisodeNumber('')
    } catch (error) {
      console.error(error)
      alert((error as Error).message || 'An error occurred during upload.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 md:p-12 font-default">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10 animate-slide-up">
        
        {/* Animated Title */}
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight animate-fade-in">
          video<span className="text-white/50 animate-pulse-slow">-</span>analyzer
        </h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          
          {/* Dropzone */}
          <div 
            className={`relative w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer ${
              isDragOver ? 'border-white bg-white/10' : 'border-white/30 hover:border-white/60 hover:bg-white/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept="video/*"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-3xl">🎥</div>
                <p className="font-medium text-lg">{file.name}</p>
                <p className="text-sm text-white/50">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <p className="text-sm text-blue-400 mt-2">Click or drag here to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-4xl">📥</div>
                <p className="font-medium text-xl">Drag & drop your video here</p>
                <p className="text-white/50">or click to browse</p>
              </div>
            )}
          </div>

          {/* Metadata Form */}
          <div className="flex flex-col gap-4 w-full">
            <input 
              type="text" 
              placeholder="Title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/20 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-white focus:bg-white/10 transition-all placeholder:text-white/40"
              required
            />
            <textarea 
              placeholder="Description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/20 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-white focus:bg-white/10 transition-all placeholder:text-white/40 resize-none"
              required
            />
            
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <select 
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full md:w-1/2 bg-white/5 border border-white/20 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-white focus:bg-white/10 transition-all appearance-none cursor-pointer"
                required
              >
                <option value="movie" className="bg-black text-white">Movie</option>
                <option value="film" className="bg-black text-white">Film</option>
                <option value="social-media" className="bg-black text-white">Social Media Post</option>
                <option value="tv-show" className="bg-black text-white">TV Show Element</option>
              </select>

              <input 
                type="text" 
                placeholder="Episode Number (Optional)" 
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(e.target.value)}
                className="w-full md:w-1/2 bg-white/5 border border-white/20 text-white rounded-2xl px-5 py-4 focus:outline-none focus:border-white focus:bg-white/10 transition-all placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={!file || isUploading}
            className={`w-full mt-2 font-semibold text-lg rounded-2xl px-6 py-4 transition-all duration-300 ${
              !file || isUploading 
                ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-white/90 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
            }`}
          >
            {isUploading ? 'Uploading & Processing...' : 'Upload Video'}
          </button>
        </form>
      </div>
    </main>
  )
}
