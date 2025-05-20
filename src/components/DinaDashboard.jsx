import { useState, useEffect } from 'react';
import { Building, ToggleLeft, ToggleRight, Lightbulb, Fan, ChevronLeft, ChevronRight } from 'lucide-react';
import supabase from '../supabaseClient';
import './DinaDashboard.css';

export default function DinaDashboard() {
  // State untuk status toggle
  const [maintenanceChartActive, setMaintenanceChartActive] = useState(false);
  const [energyChartActive, setEnergyChartActive] = useState(false);

  // State untuk toggle kedua (Lampu 2 dan Kipas 2)
  const [secondMaintenanceChartActive, setSecondMaintenanceChartActive] = useState(false);
  const [secondEnergyChartActive, setSecondEnergyChartActive] = useState(false);
  
  // State untuk aktivitas terbaru
  const [recentActivities, setRecentActivities] = useState([]);
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10; // Jumlah item per halaman

  // Fetch initial device states when component mounts
  useEffect(() => {
    fetchDeviceStates();
    fetchRecentActivities();
  }, [currentPage]); // Tambahkan currentPage sebagai dependency

  // Fungsi untuk mengambil status perangkat dari database
  const fetchDeviceStates = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('id', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Set state berdasarkan data dari database
        const device1 = data.find(d => d.id === 1);
        const device2 = data.find(d => d.id === 2);
        
        if (device1) {
          setMaintenanceChartActive(device1.status_lampu);
          setEnergyChartActive(device1.status_kipas);
        }
        
        if (device2) {
          setSecondMaintenanceChartActive(device2.status_lampu);
          setSecondEnergyChartActive(device2.status_kipas);
        }
      }
    } catch (error) {
      console.error('Error fetching device states:', error);
    }
  };

  // Fungsi untuk mengambil aktivitas terbaru dengan pagination
  const fetchRecentActivities = async () => {
    try {
      // Ambil jumlah total data untuk pagination
      const { count, error: countError } = await supabase
        .from('activity_log')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Hitung total halaman
      const totalPages = Math.ceil(count / itemsPerPage);
      setTotalPages(totalPages);
      
      // Hitung offset untuk pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // Ambil data untuk halaman saat ini
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(from, to);
        
      if (error) throw error;
      
      if (data) {
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  // Fungsi untuk memperbarui status lampu dan kipas di Supabase
  const updateDeviceStatus = async (deviceId, statusLampu, statusKipas) => {
    try {
      // Update device status
      const { error: deviceError } = await supabase
        .from('devices')
        .update({ 
          status_lampu: statusLampu, 
          status_kipas: statusKipas,
          timestamp: new Date().toISOString()
        })
        .eq('id', deviceId);

      if (deviceError) throw deviceError;
      
      // Record the activity
      const deviceInfo = await supabase.from('devices').select('nama_lampu, nama_kipas').eq('id', deviceId).single();
      
      if (deviceInfo.error) throw deviceInfo.error;
      
      const activityDescription = `Perubahan status: Device ${deviceId} - ${deviceInfo.data.nama_lampu || 'Lampu'}: ${statusLampu ? 'Nyala' : 'Mati'}, ${deviceInfo.data.nama_kipas || 'Kipas'}: ${statusKipas ? 'Nyala' : 'Mati'}`;
      
      const { error: logError } = await supabase
        .from('activity_log')
        .insert([
          { 
            device_id: deviceId, 
            activity_type: 'toggle', 
            description: activityDescription,
            status: 'Selesai',
            timestamp: new Date().toISOString()
          }
        ]);

      if (logError) throw logError;
      
      // Refresh recent activities
      fetchRecentActivities();
      
    } catch (error) {
      console.error('Error updating device status or logging activity:', error);
    }
  };

  // Handler untuk toggle pertama (Lampu 1)
  const toggleMaintenanceChart = () => {
    const newStatus = !maintenanceChartActive;
    setMaintenanceChartActive(newStatus);
    updateDeviceStatus(1, newStatus, energyChartActive); // Update lampu 1 status
  };

  // Handler untuk toggle pertama (Kipas 1)
  const toggleEnergyChart = () => {
    const newStatus = !energyChartActive;
    setEnergyChartActive(newStatus);
    updateDeviceStatus(1, maintenanceChartActive, newStatus); // Update kipas 1 status
  };

  // Handler untuk toggle kedua (Lampu 2)
  const toggleSecondMaintenanceChart = () => {
    const newStatus = !secondMaintenanceChartActive;
    setSecondMaintenanceChartActive(newStatus);
    updateDeviceStatus(2, newStatus, secondEnergyChartActive); // Update lampu 2 status
  };

  // Handler untuk toggle kedua (Kipas 2)
  const toggleSecondEnergyChart = () => {
    const newStatus = !secondEnergyChartActive;
    setSecondEnergyChartActive(newStatus);
    updateDeviceStatus(2, secondMaintenanceChartActive, newStatus); // Update kipas 2 status
  };

  // Handler untuk pagination
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Format tanggal untuk tampilan
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Render pagination controls
  const renderPaginationControls = () => {
    // Don't render pagination if there's only one page
    if (totalPages <= 1) return null;

    // Generate page numbers for pagination
    const pageNumbers = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Always ensure we show at least 5 pages if available
    if (endPage - startPage + 1 < 5) {
      if (startPage === 1) {
        endPage = Math.min(5, totalPages);
      } else if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination-controls">
        <button 
          className="pagination-button" 
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </button>
        
        {startPage > 1 && (
          <>
            <button className="pagination-button" onClick={() => goToPage(1)}>1</button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}
        
        {pageNumbers.map(number => (
          <button
            key={number}
            className={`pagination-button ${currentPage === number ? 'active' : ''}`}
            onClick={() => goToPage(number)}
          >
            {number}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
            <button className="pagination-button" onClick={() => goToPage(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
        
        <button 
          className="pagination-button" 
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="dina-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-icon">
              <Building size={24} />
            </div>
            <div className="logo-text">
              <h1>Sistem Monitoring IoT</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Page Title */}
        <div className="page-title">
          <h2>Dashboard Monitoring</h2>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          {/* Lampu 1 */}
          <div className="card">
            <div className="card-content">
              <div>
                <p className="card-label">Lampu 1</p>
                <h3 className="card-value">{maintenanceChartActive ? 'Nyala' : 'Mati'}</h3>
                <p className="card-trend positive"></p>
              </div>
              <div className="card-icon blue">
                <Lightbulb size={24} />
              </div>
            </div>
          </div>

          {/* Lampu 2 */}
          <div className="card">
            <div className="card-content">
              <div>
                <p className="card-label">Lampu 2</p>
                <h3 className="card-value">{secondMaintenanceChartActive ? 'Nyala' : 'Mati'}</h3>
                <p className="card-trend negative"></p>
              </div>
              <div className="card-icon green">
                <Lightbulb size={24} />
              </div>
            </div>
          </div>

          {/* Kipas 1 */}
          <div className="card">
            <div className="card-content">
              <div>
                <p className="card-label">Kipas 1</p>
                <h3 className="card-value">{energyChartActive ? 'Nyala' : 'Mati'}</h3>
                <p className="card-trend negative"></p>
              </div>
              <div className="card-icon yellow">
                <Fan size={24} />
              </div>
            </div>
          </div>

          {/* Kipas 2 */}
          <div className="card">
            <div className="card-content">
              <div>
                <p className="card-label">Kipas 2</p>
                <h3 className="card-value">{secondEnergyChartActive ? 'Nyala' : 'Mati'}</h3>
                <p className="card-trend positive"></p>
              </div>
              <div className="card-icon purple">
                <Fan size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Toggle Controls */}
        <div className="chart-container">
          {/* Lampu */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Lampu</h3>
            </div>
            <div className="toggle-container">
              {/* Toggle pertama */}
              <button
                className="toggle-button"
                onClick={toggleMaintenanceChart}
                aria-label={maintenanceChartActive ? 'Nonaktifkan Lampu 1' : 'Aktifkan Lampu 1'}
              >
                <span className="toggle-text">Lampu 1</span>
                {maintenanceChartActive ? (
                  <div className="toggle-active">
                    <span>ON</span>
                    <ToggleRight size={24} />
                  </div>
                ) : (
                  <div className="toggle-inactive">
                    <span>OFF</span>
                    <ToggleLeft size={24} />
                  </div>
                )}
              </button>

              {/* Toggle kedua */}
              <button
                className="toggle-button"
                onClick={toggleSecondMaintenanceChart}
                aria-label={secondMaintenanceChartActive ? 'Nonaktifkan Lampu 2' : 'Aktifkan Lampu 2'}
              >
                <span className="toggle-text">Lampu 2</span>
                {secondMaintenanceChartActive ? (
                  <div className="toggle-active">
                    <span>ON</span>
                    <ToggleRight size={24} />
                  </div>
                ) : (
                  <div className="toggle-inactive">
                    <span>OFF</span>
                    <ToggleLeft size={24} />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Kipas */}
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Kipas</h3>
            </div>
            <div className="toggle-container">
              {/* Toggle pertama */}
              <button
                className="toggle-button"
                onClick={toggleEnergyChart}
                aria-label={energyChartActive ? 'Nonaktifkan Kipas 1' : 'Aktifkan Kipas 1'}
              >
                <span className="toggle-text">Kipas 1</span>
                {energyChartActive ? (
                  <div className="toggle-active">
                    <span>ON</span>
                    <ToggleRight size={24} />
                  </div>
                ) : (
                  <div className="toggle-inactive">
                    <span>OFF</span>
                    <ToggleLeft size={24} />
                  </div>
                )}
              </button>

              {/* Toggle kedua */}
              <button
                className="toggle-button"
                onClick={toggleSecondEnergyChart}
                aria-label={secondEnergyChartActive ? 'Nonaktifkan Kipas 2' : 'Aktifkan Kipas 2'}
              >
                <span className="toggle-text">Kipas 2</span>
                {secondEnergyChartActive ? (
                  <div className="toggle-active">
                    <span>ON</span>
                    <ToggleRight size={24} />
                  </div>
                ) : (
                  <div className="toggle-inactive">
                    <span>OFF</span>
                    <ToggleLeft size={24} />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Table with Pagination */}
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Aktivitas Terbaru</h3>
            <div className="pagination-info">
              Halaman {currentPage} dari {totalPages}
            </div>
          </div>
          <div className="table-container">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>DESKRIPSI</th>
                  <th>STATUS</th>
                  <th>TANGGAL</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <tr key={activity.id || index}>
                      <td>MT-{activity.id}</td>
                      <td>{activity.description}</td>
                      <td>
                        <span className={`status-badge ${activity.status?.toLowerCase() || 'completed'}`}>
                          {activity.status || 'Selesai'}
                        </span>
                      </td>
                      <td>{formatDate(activity.timestamp)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">Tidak ada aktivitas terbaru</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-container">
            {renderPaginationControls()}
          </div>
        </div>
      </main>
    </div>
  );
}