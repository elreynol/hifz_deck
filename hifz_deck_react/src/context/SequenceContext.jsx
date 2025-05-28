import React, { createContext, useContext, useState, useEffect } from 'react'

const SequenceContext = createContext()

export function useSequence() {
  const context = useContext(SequenceContext)
  if (!context) {
    throw new Error('useSequence must be used within a SequenceProvider')
  }
  return context
}

export function SequenceProvider({ children }) {
  const [sequence, setSequence] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadSurahs = async () => {
      console.log('Starting to load surahs...')
      try {
        const response = await fetch('/juz_amma_surahs.json')
        console.log('Fetch response:', response.status, response.statusText)
        
        if (!response.ok) {
          throw new Error(`Failed to load surahs: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('Loaded data:', data)
        
        const formattedSequence = Object.entries(data).map(([number, surah]) => ({
          number: parseInt(number),
          name: surah.name,
          ayat: surah.ayat
        })).sort((a, b) => a.number - b.number)
        
        console.log('Formatted sequence:', formattedSequence)
        setSequence(formattedSequence)
        setIsLoading(false)
      } catch (err) {
        console.error('Error in loadSurahs:', err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    loadSurahs()
  }, [])

  console.log('SequenceContext state:', { sequence, isLoading, error })

  const value = {
    sequence,
    setSequence,
    isLoading,
    error
  }

  return (
    <SequenceContext.Provider value={value}>
      {children}
    </SequenceContext.Provider>
  )
} 