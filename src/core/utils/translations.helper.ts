/**
 * Helper para traducciones de mensajes del sistema
 */

export const translations = {
  vehicleNotAvailable: {
    es: (vehicleName: string, startDate: string, endDate: string) =>
      `Lo sentimos, el vehículo "${vehicleName}" no está disponible para las fechas seleccionadas (${startDate} - ${endDate}). Por favor, selecciona otro vehículo.`,
    en: (vehicleName: string, startDate: string, endDate: string) =>
      `Sorry, the vehicle "${vehicleName}" is not available for the selected dates (${startDate} - ${endDate}). Please select another vehicle.`,
  },
  vehicleNotAvailableWithSuggestion: {
    es: (vehicleName: string, startDate: string, endDate: string) =>
      `Lo sentimos, el vehículo "${vehicleName}" no está disponible para las fechas seleccionadas (${startDate} - ${endDate}). Por favor, selecciona otro vehículo o cambia las fechas.`,
    en: (vehicleName: string, startDate: string, endDate: string) =>
      `Sorry, the vehicle "${vehicleName}" is not available for the selected dates (${startDate} - ${endDate}). Please select another vehicle or change the dates.`,
  },
  vehicleNotAvailableRaceCondition: {
    es: (vehicleName: string, startDate: string, endDate: string) =>
      `Lo sentimos, el vehículo "${vehicleName}" ya no está disponible para las fechas seleccionadas (${startDate} - ${endDate}). Otro usuario lo reservó mientras completabas tu compra. Por favor, selecciona otro vehículo. Tu reserva ha sido cancelada automáticamente.`,
    en: (vehicleName: string, startDate: string, endDate: string) =>
      `Sorry, the vehicle "${vehicleName}" is no longer available for the selected dates (${startDate} - ${endDate}). Another user reserved it while you were completing your purchase. Please select another vehicle. Your reservation has been automatically cancelled.`,
  },
  vehicleNotFound: {
    es: (vehicleId: string) =>
      `El vehículo ${vehicleId} no fue encontrado. La reserva ha sido cancelada.`,
    en: (vehicleId: string) =>
      `Vehicle ${vehicleId} was not found. The reservation has been cancelled.`,
  },
};

/**
 * Obtiene la traducción correspondiente según el idioma
 * @param key Clave de la traducción
 * @param lang Idioma (es o en)
 * @param vehicleName Nombre del vehículo
 * @param startDate Fecha de inicio formateada
 * @param endDate Fecha de fin formateada
 * @returns Mensaje traducido
 */
export function getTranslation(
  key: keyof typeof translations,
  lang: string = 'es',
  vehicleName: string,
  startDate: string,
  endDate: string
): string {
  const normalizedLang = (lang?.toLowerCase() === 'en' ? 'en' : 'es') as 'es' | 'en';
  const translationFn = translations[key][normalizedLang];
  
  if (typeof translationFn === 'function') {
    return translationFn(vehicleName, startDate, endDate);
  }
  
  // Fallback a español si no se encuentra la traducción
  return translations[key]['es'](vehicleName, startDate, endDate);
}

/**
 * Formatea una fecha según el idioma
 * @param date Fecha a formatear
 * @param lang Idioma (es o en)
 * @returns Fecha formateada
 */
export function formatDate(date: Date, lang: string = 'es'): string {
  const normalizedLang = lang?.toLowerCase() === 'en' ? 'en' : 'es';
  const locale = normalizedLang === 'en' ? 'en-US' : 'es-ES';
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
