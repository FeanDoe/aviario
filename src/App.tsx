import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

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
const CHILE_PLACE_ID = 7182

const REGIONS: { label: string; placeId: number }[] = [
  { label: 'Arica y Parinacota', placeId: 96834 },
  { label: 'Tarapacá', placeId: 12692 },
  { label: 'Antofagasta', placeId: 13339 },
  { label: 'Atacama', placeId: 12680 },
  { label: 'Coquimbo', placeId: 12682 },
  { label: 'Valparaíso', placeId: 13343 },
  { label: 'Metropolitana de Santiago', placeId: 12691 },
  { label: "O'Higgins", placeId: 12683 },
  { label: 'Maule', placeId: 12690 },
  { label: 'Ñuble', placeId: 212134 },
  { label: 'Biobío', placeId: 82677 },
  { label: 'La Araucanía', placeId: 12679 },
  { label: 'Los Ríos', placeId: 96835 },
  { label: 'Los Lagos', placeId: 13341 },
  { label: 'Aysén', placeId: 125708 },
  { label: 'Magallanes', placeId: 13342 },
]

function buildUrl(regionPlaceId: number | null): string {
  const base = `https://api.inaturalist.org/v1/observations?user_login=${INATURALIST_USER}&has[]=photos&has[]=geo&per_page=200&order=created_at&order_by=desc&locale=es&preferred_place_id=7182`
  return regionPlaceId ? `${base}&place_id=${regionPlaceId}` : base
}

export default function App() {
  const [observations, setObservations] = useState<Observation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<number | null>(CHILE_PLACE_ID)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 300)
    return () => clearTimeout(timer)
  }, [sidebarOpen])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(buildUrl(selectedRegion))
      .then((res) => res.json())
      .then((data) => setObservations(data.results))
      .catch(() => setError('No se pudieron cargar las observaciones.'))
      .finally(() => setLoading(false))
  }, [selectedRegion])

  return (
    <div className="app">
      <aside className={`sidebar${sidebarOpen ? '' : ' sidebar--collapsed'}`}>
        <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title={sidebarOpen ? 'Ocultar panel' : 'Mostrar panel'}>
          {sidebarOpen ? '‹' : '›'}
        </button>
        {sidebarOpen && <>
          <h2>Aviario</h2>
          <p className="count">
            {loading ? 'Cargando...' : `${observations.length} observaciones`}
          </p>
          <hr />
          <h3>Lugar</h3>
          <ul className="region-list">
            <li>
              <button
                className={selectedRegion === null ? 'active' : ''}
                onClick={() => setSelectedRegion(null)}
              >
                Todo el mundo
              </button>
            </li>
            <li>
              <button
                className={selectedRegion === CHILE_PLACE_ID ? 'active' : ''}
                onClick={() => setSelectedRegion(CHILE_PLACE_ID)}
              >
                Chile
              </button>
            </li>
            <hr />
            {REGIONS.map((r) => (
              <li key={r.placeId}>
                <button
                  className={selectedRegion === r.placeId ? 'active' : ''}
                  onClick={() => setSelectedRegion(r.placeId)}
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        </>}
      </aside>

      {error && <div className="overlay error">{error}</div>}

      <div className={`map-wrapper${sidebarOpen ? '' : ' map-wrapper--full'}`}>
      <MapContainer
        center={[-35.6, -71.5]}
        zoom={5}
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MarkerClusterGroup chunkedLoading>
        {observations.map((obs) => {
          const [lat, lng] = obs.location.split(',').map(Number)
          const photoUrl = obs.photos[0]?.url.replace('square', 'medium')
          const commonName = obs.taxon?.preferred_common_name
          const sciName = obs.taxon?.name ?? 'Desconocido'

          const largeUrl = obs.photos[0]?.url.replace('square', 'large')

          return (
            <Marker key={obs.id} position={[lat, lng]}>
              <Popup>
                <div className="popup">
                  <strong>{commonName ?? sciName}</strong>
                  {commonName && <em>{sciName}</em>}
                  <span>{obs.observed_on}{obs.place_guess ? ` · ${obs.place_guess}` : ''}</span>
                  {photoUrl && (
                    <img
                      src={photoUrl}
                      alt={commonName ?? sciName}
                      className="popup-img"
                      onClick={() => setModalUrl(largeUrl ?? photoUrl)}
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
        </MarkerClusterGroup>
      </MapContainer>
      </div>

      {modalUrl && (
        <div className="modal-backdrop" onClick={() => setModalUrl(null)}>
          <img src={modalUrl} className="modal-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
