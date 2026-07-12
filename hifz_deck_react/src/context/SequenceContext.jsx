import React, { createContext, useContext, useState, useEffect } from 'react'

const SequenceContext = createContext()

export function useSequence() {
  const context = useContext(SequenceContext)
  if (!context) {
    throw new Error('useSequence must be used within a SequenceProvider')
  }
  return context
}

/**
 * Loads full Quran offline JSON (built from api.quran.com / QUL-compatible Imlaei).
 * Exposes quran data + a legacy `sequence` list of surahs for compatibility.
 */
export function SequenceProvider({ children }) {
  const [quran, setQuran] = useState(null)
  const [sequence, setSequence] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('quran_data.json')
        if (!response.ok) {
          throw new Error(`Failed to load Quran data: ${response.statusText}`)
        }
        const data = await response.json()
        const surahList = Object.values(data.surahs || {})
          .map((s) => ({
            number: s.number,
            name: s.name,
            nameSimple: s.nameSimple,
            ayat: s.ayat,
            versesCount: s.versesCount,
          }))
          .sort((a, b) => a.number - b.number)

        setQuran(data)
        setSequence(surahList)
        setIsLoading(false)
      } catch (err) {
        console.error('Error loading Quran data:', err)
        setError(err.message)
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const value = {
    quran,
    sequence,
    setSequence,
    isLoading,
    error,
  }

  return (
    <SequenceContext.Provider value={value}>
      {children}
    </SequenceContext.Provider>
  )
}
