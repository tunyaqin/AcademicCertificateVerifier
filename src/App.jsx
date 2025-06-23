import { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import contractJson from "./artifacts/contracts/Certificate.sol/Certificate.json";
import addressJson from "./artifacts/contracts/Certificate.sol/contract-address.json";

const CONTRACT_ABI = contractJson.abi;
const CONTRACT_ADDRESS = addressJson.Certificate;

function StudentView({ contract, account }) {
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      const count = await contract.getCertificateCount(account);
      const fetchedCerts = [];

      for (let i = 0; i < count; i++) {
        const cert = await contract.getCertificateAt(account, i);
        fetchedCerts.push({
          index: i,
          studentName: cert[0],
          ipfsHash: cert[1],
          isValid: cert[2],
        });
      }

      setCertificates(fetchedCerts);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert(`❌ Error: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCertificates = certificates.filter(cert => {
    if (filter === 'all') return true;
    return filter === 'valid' ? cert.isValid : !cert.isValid;
  });

  return (
    <div className="student-view">
      <div className="view-header">
        <h2>My Certificates</h2>
        <div className="controls">
          <div className="filter-buttons">
            <button 
              className={`filter-button ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-button ${filter === 'valid' ? 'active' : ''}`}
              onClick={() => setFilter('valid')}
            >
              Valid
            </button>
            <button 
              className={`filter-button ${filter === 'revoked' ? 'active' : ''}`}
              onClick={() => setFilter('revoked')}
            >
              Revoked
            </button>
          </div>
          <button
            className="refresh-button"
            onClick={fetchCertificates}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span> Loading...
              </>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      <div className="certificates-grid">
        {filteredCertificates.length > 0 ? (
          filteredCertificates.map((cert) => (
            <div key={cert.index} className={`certificate-card ${!cert.isValid ? 'revoked' : ''}`}>
              <div className="card-header">
                <h3>{cert.studentName}</h3>
                <span className={`status-badge ${cert.isValid ? 'valid' : 'revoked'}`}>
                  {cert.isValid ? 'VALID' : 'REVOKED'}
                </span>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <span className="detail-label">IPFS Hash:</span>
                  <span className="detail-value">{cert.ipfsHash}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Certificate ID:</span>
                  <span className="detail-value">{cert.index}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>{filter === 'all' ? "No certificates found" : `No ${filter} certificates found`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UniversityView({ contract }) {
  const [studentAddress, setStudentAddress] = useState("");
  const [studentName, setStudentName] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("issue");
  const [currentStudent, setCurrentStudent] = useState(null);

  const fetchStudentCertificates = async (address) => {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error("Please enter a valid Ethereum address");
      }

      setIsLoading(true);
      const count = await contract.getCertificateCount(address);
      const fetchedCerts = [];

      for (let i = 0; i < count; i++) {
        const cert = await contract.getCertificateAt(address, i);
        fetchedCerts.push({
          index: i,
          studentName: cert[0],
          ipfsHash: cert[1],
          isValid: cert[2],
        });
      }

      setCertificates(fetchedCerts);
      setCurrentStudent(address);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert(`❌ Error: ${err.reason || err.message}`);
      setCurrentStudent(null);
    } finally {
      setIsLoading(false);
    }
  };

  const issueCertificate = async () => {
    if (!ethers.isAddress(studentAddress)) {
      alert("Please enter a valid student address");
      return;
    }

    try {
      setIsLoading(true);
      const tx = await contract.issueCertificate(
        studentAddress, 
        studentName, 
        ipfsHash,
        { gasLimit: 500000 }
      );
      await tx.wait();
      alert("✅ Certificate issued successfully!");
      setStudentAddress("");
      setStudentName("");
      setIpfsHash("");
      await fetchStudentCertificates(studentAddress);
    } catch (err) {
      console.error("Issue Error:", err);
      alert(`❌ Error: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeCertificate = async (index) => {
    try {
      if (!currentStudent) {
        throw new Error("Please search for a student first");
      }
      if (isNaN(index)) {
        throw new Error("Invalid certificate index");
      }

      setIsLoading(true);
      const tx = await contract.revokeCertificate(
        currentStudent,
        index,
        { gasLimit: 300000 }
      );
      await tx.wait();
      alert("✅ Certificate revoked successfully!");
      await fetchStudentCertificates(currentStudent);
    } catch (err) {
      console.error("Revoke Error:", err);
      alert(`❌ Revoke Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="university-view">
      <div className="view-header">
        <h2>University Dashboard</h2>
      </div>
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === "issue" ? "active" : ""}`}
          onClick={() => setActiveTab("issue")}
        >
          Issue Certificate
        </button>
        <button
          className={`tab ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Certificates
        </button>
      </div>

      {activeTab === "issue" ? (
        <div className="issue-form">
          <h3>Issue New Certificate</h3>
          <div className="form-group">
            <div className="input-field">
              <label>Student Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={studentAddress}
                onChange={(e) => setStudentAddress(e.target.value)}
              />
            </div>
            <div className="input-field">
              <label>Student Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="input-field">
              <label>IPFS Hash</label>
              <input
                type="text"
                placeholder="Qm..."
                value={ipfsHash}
                onChange={(e) => setIpfsHash(e.target.value)}
              />
            </div>
          </div>
          <button
            className="primary-button"
            onClick={issueCertificate}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span> Processing...
              </>
            ) : (
              'Issue Certificate'
            )}
          </button>
        </div>
      ) : (
        <div className="manage-certificates">
          <h3>Manage Certificates</h3>
          <div className="search-container">
            <div className="search-input">
              <input
                type="text"
                placeholder="Enter Student Address (0x...)"
                value={studentAddress}
                onChange={(e) => setStudentAddress(e.target.value)}
              />
              <button
                className="search-button"
                onClick={() => fetchStudentCertificates(studentAddress)}
                disabled={isLoading}
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {currentStudent && (
            <div className="current-student">
              <span>Managing:</span>
              <code>{currentStudent}</code>
            </div>
          )}

          {certificates.length > 0 ? (
            <div className="certificates-grid">
              {certificates.map((cert) => (
                <div key={cert.index} className="certificate-card">
                  <div className="card-header">
                    <h3>{cert.studentName}</h3>
                    <span className={`status-badge ${cert.isValid ? 'valid' : 'revoked'}`}>
                      {cert.isValid ? 'VALID' : 'REVOKED'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="detail-row">
                      <span className="detail-label">IPFS Hash:</span>
                      <span className="detail-value">{cert.ipfsHash}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Certificate ID:</span>
                      <span className="detail-value">{cert.index}</span>
                    </div>
                  </div>
                  {cert.isValid && (
                    <div className="card-footer">
                      <button
                        className="danger-button"
                        onClick={() => revokeCertificate(cert.index)}
                        disabled={isLoading}
                      >
                        Revoke Certificate
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : currentStudent ? (
            <div className="empty-state">
              <p>No certificates found for this student</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>Search for a student to view their certificates</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [isUniversity, setIsUniversity] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBlockchain = async () => {
      if (window.ethereum) {
        try {
          setIsLoading(true);
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const userAddress = await signer.getAddress();
          setAccount(userAddress);

          const contractInstance = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
          );
          setContract(contractInstance);

          const uniAddress = await contractInstance.university();
          setIsUniversity(userAddress.toLowerCase() === uniAddress.toLowerCase());
        } catch (error) {
          console.error("Initialization error:", error);
          alert(`Connection error: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        alert("Please install MetaMask!");
        setIsLoading(false);
      }
    };

    loadBlockchain();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        loadBlockchain();
      }
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
    } catch (error) {
      console.error("Wallet connection error:", error);
      alert(`Connection error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Blockchain Certificate System</h1>
          {account ? (
            <div className="account-info">
              <span className="wallet-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              {isUniversity && <span className="university-badge">University</span>}
            </div>
          ) : (
            <button
              className="connect-wallet-button"
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="app-content">
        {isLoading ? (
          <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Loading blockchain data...</p>
          </div>
        ) : !account ? (
          <div className="welcome-screen">
            <h2>Welcome to Certificate System</h2>
            <p>Connect your wallet to view or manage certificates</p>
            <button
              className="connect-wallet-button large"
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : isUniversity ? (
          <UniversityView contract={contract} />
        ) : (
          <StudentView contract={contract} account={account} />
        )}
      </main>
    </div>
  );
}

export default App;