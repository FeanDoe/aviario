import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default marker icons broken by Vite's asset handling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

interface Observation {
  id: number
  observed_on: string
  place_guess: string
  taxon: {
    name: string
    preferred_common_name?: string
  } | null
  location: string
  photos: Array<{ url: string }>
}

const INATURALIST_USER = 'feandoe'

export default function App() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(
      `https://api.inaturalist.org/v1/observations?user_login=${INATURALIST_USER}&has[]=photos&has[]=geo&per_page=200&order=created_at&order_by=desc&locale=es-CL`
    )
      .then((res) => res.json())
      .then((data) => setObservations(data.results))
      .catch(() => setError('No se pudieron cargar las observaciones.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app">
      {loading && (
        <div className="overlay">Cargando observaciones...</div>
      )}
      {error && (
        <div className="overlay error">{error}</div>
      )}
      <MapContainer
        center={[-35.6, -71.5]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {observations.map((obs) => {
          const [lat, lng] = obs.location.split(',').map(Number)
          const photoUrl = obs.photos[0]?.url.replace('square', 'medium')
          const commonName = obs.taxon?.preferred_common_name
          const sciName = obs.taxon?.name ?? 'Desconocido'

          return (
            <Marker key={obs.id} position={[lat, lng]}>
              <Popup>
                <div className="popup">
                  <strong>{commonName ?? sciName}</strong>
                  {commonName && <em>{sciName}</em>}
                  <span>{obs.observed_on}{obs.place_guess ? ` · ${obs.place_guess}` : ''}</span>
                  {photoUrl && (
                    <img src={photoUrl} alt={commonName ?? sciName} />
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
