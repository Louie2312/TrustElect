const formatElectionDate = (dateStr, timeStr) => {
  try {
    if (!dateStr || !timeStr) return { display: 'Date not set' };

    
    const [hours, minutes = '00'] = timeStr.split(':');
    const normalizedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    
    
    const date = new Date(`${dateStr}T${normalizedTime}:00+08:00`);
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateStr, timeStr);
      return { display: 'Invalid date' };
    }

    // Format for display
    const display = date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return {
      raw_date: dateStr,
      raw_time: timeStr,
      display,
      iso: date.toISOString()
    };
  } catch (error) {
    console.error('Date formatting error:', error);
    return { display: 'Date format error' };
  }
};

module.exports = { formatElectionDate };