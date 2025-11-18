# Implementación Frontend - Exportar Reservas a Excel

## Endpoint

```
GET /booking/export/excel
```

**Autenticación**: Requiere token JWT en el header `Authorization`

**Roles permitidos**: ADMIN, SELLER, SUPERVISOR, SUPERADMIN

---

## Parámetros de Query (Opcionales)

Todos los filtros son opcionales y se pueden combinar:

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `status` | string | ID del estado | `?status=507f1f77bcf86cd799439011` |
| `paymentMethod` | string | ID del método de pago | `?paymentMethod=507f1f77bcf86cd799439012` |
| `userId` | string | ID del usuario | `?userId=507f1f77bcf86cd799439013` |
| `startDate` | string | Fecha de inicio (YYYY-MM-DD) | `?startDate=2024-01-01` |
| `endDate` | string | Fecha de fin (YYYY-MM-DD) | `?endDate=2024-12-31` |
| `isReserve` | boolean | Filtrar por reservas | `?isReserve=true` |

---

## Implementación en React/Next.js

### Opción 1: Con Server-Sent Events (SSE) - CON PROGRESO ⭐ (Recomendado)

```typescript
import { useState } from 'react';

const exportBookingsToExcel = async (
  filters = {},
  onProgress?: (progress: number, message: string) => void
) => {
  try {
    const token = localStorage.getItem('token');
    
    // Construir los parámetros de query
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.isReserve !== undefined) params.append('isReserve', filters.isReserve);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/booking/export/excel?${params.toString()}`;

    // Usar fetch para SSE
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al exportar reservas');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          // Actualizar progreso
          if (onProgress && data.progress !== undefined) {
            onProgress(data.progress, data.message);
          }

          // Si recibimos el archivo, descargarlo
          if (data.file && data.filename) {
            // Convertir base64 a blob
            const byteCharacters = atob(data.file);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Descargar archivo
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          }

          // Si hay error
          if (data.error) {
            throw new Error(data.error);
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error exportando reservas:', error);
    return { success: false, error };
  }
};

// Uso en un componente con barra de progreso
const BookingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setProgress(0);
    setProgressMessage('Iniciando exportación...');
    
    const filters = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    const result = await exportBookingsToExcel(filters, (prog, msg) => {
      setProgress(prog);
      setProgressMessage(msg);
    });
    
    if (result.success) {
      alert('Archivo descargado exitosamente');
    } else {
      alert('Error al descargar el archivo');
    }
    
    setLoading(false);
    setProgress(0);
    setProgressMessage('');
  };

  return (
    <div>
      <button 
        onClick={handleExport}
        disabled={loading}
      >
        {loading ? 'Exportando...' : 'Exportar a Excel'}
      </button>
      
      {loading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
          <p>{progressMessage}</p>
        </div>
      )}
    </div>
  );
};
```

### Opción 2: Con Axios (Sin progreso - Más simple)

```typescript
import axios from 'axios';

const exportBookingsToExcel = async (filters = {}) => {
  try {
    // Obtener el token de autenticación (ajusta según tu implementación)
    const token = localStorage.getItem('token'); // o desde tu store de estado
    
    // Construir los parámetros de query
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.isReserve !== undefined) params.append('isReserve', filters.isReserve);

    // Hacer la petición
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/booking/export/excel?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob', // IMPORTANTE: Especificar que esperamos un blob
      }
    );

    // Crear un blob con la respuesta
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Crear un enlace temporal y descargarlo
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('Error exportando reservas:', error);
    return { success: false, error };
  }
};

// Uso en un componente
const BookingsPage = () => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    
    const filters = {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      // status: 'ID_DEL_STATUS',
      // isReserve: true,
    };

    const result = await exportBookingsToExcel(filters);
    
    if (result.success) {
      alert('Archivo descargado exitosamente');
    } else {
      alert('Error al descargar el archivo');
    }
    
    setLoading(false);
  };

  return (
    <button 
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? 'Exportando...' : 'Exportar a Excel'}
    </button>
  );
};
```

### Opción 2: Con Fetch API

```typescript
const exportBookingsToExcel = async (filters = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    // Construir URL con parámetros
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.isReserve !== undefined) params.append('isReserve', filters.isReserve);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/booking/export/excel?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al exportar reservas');
    }

    // Obtener el blob de la respuesta
    const blob = await response.blob();

    // Crear enlace de descarga
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `reservas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error };
  }
};
```

### Opción 3: Componente Completo con Filtros

```typescript
import React, { useState } from 'react';
import axios from 'axios';

interface ExportFilters {
  status?: string;
  paymentMethod?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  isReserve?: boolean;
}

const BookingExportButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    startDate: '',
    endDate: '',
  });

  const exportToExcel = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Construir parámetros
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/booking/export/excel?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      // Descargar archivo
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reservas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Archivo exportado exitosamente');
    } catch (error) {
      console.error('Error exportando:', error);
      alert('Error al exportar el archivo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <h3>Exportar Reservas a Excel</h3>
      
      <div className="filters">
        <div>
          <label>Fecha Inicio:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
        </div>

        <div>
          <label>Fecha Fin:</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>

        <div>
          <label>Solo Reservas:</label>
          <input
            type="checkbox"
            checked={filters.isReserve || false}
            onChange={(e) => setFilters({ ...filters, isReserve: e.target.checked })}
          />
        </div>
      </div>

      <button 
        onClick={exportToExcel}
        disabled={loading}
        className="export-button"
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Exportando...
          </>
        ) : (
          <>
            📊 Exportar a Excel
          </>
        )}
      </button>
    </div>
  );
};

export default BookingExportButton;
```

---

## Implementación en Vue.js

```typescript
<template>
  <div class="export-container">
    <h3>Exportar Reservas a Excel</h3>
    
    <div class="filters">
      <div>
        <label>Fecha Inicio:</label>
        <input type="date" v-model="filters.startDate" />
      </div>

      <div>
        <label>Fecha Fin:</label>
        <input type="date" v-model="filters.endDate" />
      </div>

      <div>
        <label>Solo Reservas:</label>
        <input type="checkbox" v-model="filters.isReserve" />
      </div>
    </div>

    <button 
      @click="exportToExcel"
      :disabled="loading"
      class="export-button"
    >
      {{ loading ? 'Exportando...' : '📊 Exportar a Excel' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';

interface ExportFilters {
  status?: string;
  paymentMethod?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  isReserve?: boolean;
}

const loading = ref(false);
const filters = ref<ExportFilters>({
  startDate: '',
  endDate: '',
});

const exportToExcel = async () => {
  loading.value = true;
  
  try {
    const token = localStorage.getItem('token');
    
    // Construir parámetros
    const params = new URLSearchParams();
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/booking/export/excel?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        responseType: 'blob',
      }
    );

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    alert('Archivo exportado exitosamente');
  } catch (error) {
    console.error('Error exportando:', error);
    alert('Error al exportar el archivo');
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## Implementación en Angular

```typescript
// booking-export.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface ExportFilters {
  status?: string;
  paymentMethod?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  isReserve?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BookingExportService {
  constructor(private http: HttpClient) {}

  exportToExcel(filters: ExportFilters = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('token');
      
      // Construir parámetros
      let params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const url = `${environment.apiUrl}/booking/export/excel?${params.toString()}`;

      this.http.get(url, {
        headers: new HttpHeaders({
          'Authorization': `Bearer ${token}`
        }),
        responseType: 'blob'
      }).subscribe({
        next: (blob: Blob) => {
          // Crear enlace de descarga
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reservas_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          resolve();
        },
        error: (error) => {
          console.error('Error exportando:', error);
          reject(error);
        }
      });
    });
  }
}

// booking-export.component.ts
import { Component } from '@angular/core';
import { BookingExportService, ExportFilters } from './booking-export.service';

@Component({
  selector: 'app-booking-export',
  template: `
    <div class="export-container">
      <h3>Exportar Reservas a Excel</h3>
      
      <div class="filters">
        <div>
          <label>Fecha Inicio:</label>
          <input type="date" [(ngModel)]="filters.startDate" />
        </div>

        <div>
          <label>Fecha Fin:</label>
          <input type="date" [(ngModel)]="filters.endDate" />
        </div>

        <div>
          <label>Solo Reservas:</label>
          <input type="checkbox" [(ngModel)]="filters.isReserve" />
        </div>
      </div>

      <button 
        (click)="exportToExcel()"
        [disabled]="loading"
        class="export-button"
      >
        {{ loading ? 'Exportando...' : '📊 Exportar a Excel' }}
      </button>
    </div>
  `
})
export class BookingExportComponent {
  loading = false;
  filters: ExportFilters = {
    startDate: '',
    endDate: '',
  };

  constructor(private exportService: BookingExportService) {}

  async exportToExcel() {
    this.loading = true;
    
    try {
      await this.exportService.exportToExcel(this.filters);
      alert('Archivo exportado exitosamente');
    } catch (error) {
      alert('Error al exportar el archivo');
    } finally {
      this.loading = false;
    }
  }
}
```

---

## Notas Importantes

### 1. **responseType: 'blob'**
Es **CRÍTICO** especificar `responseType: 'blob'` en la petición HTTP. Sin esto, el archivo se corromperá.

### 2. **Headers de Autenticación**
Asegúrate de incluir el token JWT en el header `Authorization`:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### 3. **Manejo de Errores**
Implementa un manejo de errores adecuado:
```typescript
try {
  // código de exportación
} catch (error) {
  if (error.response?.status === 401) {
    // Token expirado o inválido
    alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
  } else if (error.response?.status === 403) {
    // Sin permisos
    alert('No tienes permisos para exportar reservas.');
  } else {
    alert('Error al exportar el archivo. Intenta nuevamente.');
  }
}
```

### 4. **Variables de Entorno**
Configura la URL base de tu API en las variables de entorno:

**Next.js (.env.local)**
```
NEXT_PUBLIC_API_URL=https://tu-api.com/api
```

**Vue.js (.env)**
```
VITE_API_URL=https://tu-api.com/api
```

**Angular (environment.ts)**
```typescript
export const environment = {
  apiUrl: 'https://tu-api.com/api'
};
```

---

## Ejemplo de Uso Completo

```typescript
// Exportar todas las reservas
await exportBookingsToExcel();

// Exportar reservas de un rango de fechas
await exportBookingsToExcel({
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// Exportar solo reservas (isReserve = true)
await exportBookingsToExcel({
  isReserve: true
});

// Exportar con múltiples filtros
await exportBookingsToExcel({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  status: '507f1f77bcf86cd799439011',
  isReserve: false
});
```

---

## Contenido del Excel Exportado

El archivo Excel incluirá las siguientes columnas:

1. Número de Reserva
2. Estado
3. Método de Pago
4. Medio de Pago
5. Total Inicial
6. Total Pagado
7. Servicios (con detalles)
8. Fecha de Creación
9. Hotel
10. Nombre Cliente
11. Email Cliente
12. Teléfono Cliente
13. Concierge
14. Origen (Web/Dashboard)
15. Tiene Extensión
16. Monto Extensión
17. Fecha Fin Extensión
18. Es Reserva

---

## Testing

Para probar el endpoint, puedes usar:

### cURL
```bash
curl -X GET "https://tu-api.com/api/booking/export/excel?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer TU_TOKEN" \
  --output reservas.xlsx
```

### Postman
1. Método: GET
2. URL: `https://tu-api.com/api/booking/export/excel`
3. Headers: `Authorization: Bearer TU_TOKEN`
4. En la respuesta, haz clic en "Save Response" > "Save to a file"
