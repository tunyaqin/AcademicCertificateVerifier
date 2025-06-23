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

  return (
    <div className="student-card">
      <button
        className={`action-button ${isLoading ? "loading" : ""}`}
        onClick={fetchCertificates}
        disabled={isLoading}
      >
        {isLoading ? "Loading..." : "Refresh Certificates"}
      </button>

      <div className="certificates-list">
        {certificates.length > 0 ? (
          certificates.map((cert, i) => (
            <div key={i} className={`certificate-item ${cert.isValid ? "" : "revoked"}`}>
              <h3>{cert.studentName}</h3>
              <p className="ipfs-hash">IPFS: {cert.ipfsHash}</p>
              <p className="status">
                Status: <span>{cert.isValid ? "✅ Valid" : "❌ Revoked"}</span>
              </p>
            </div>
          ))
        ) : (
          <p className="no-certificates">No certificates found</p>
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
      setCurrentStudent(address); // Store the validated address
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
      console.error("Issue Error:", {
        error: err,
        message: err.message,
        data: err.data
      });
      alert(`❌ Error: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const revokeCertificate = async (index) => {
    try {
      if (!currentStudent) {
        throw new Error("No student selected. Please search for a student first.");
      }
      if (isNaN(index)) {
        throw new Error("Invalid certificate index");
      }

      setIsLoading(true);
      const tx = await contract.revokeCertificate(
        currentStudent, // Use the stored validated address
        index,
        { gasLimit: 300000 }
      );
      
      console.log("Revoke TX:", {
        address: currentStudent,
        index,
        txHash: tx.hash
      });
      
      await tx.wait();
      alert("✅ Certificate revoked successfully!");
      await fetchStudentCertificates(currentStudent);
    } catch (err) {
      console.error("Revoke Error:", {
        error: err,
        address: currentStudent,
        index,
        contractAddress: contract.address
      });
      alert(`❌ Revoke Failed: ${err.reason || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="university-view">
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
          <h2>Issue New Certificate</h2>
          <div className="form-group">
            <input
              type="text"
              placeholder="Student Address (0x...)"
              value={studentAddress}
              onChange={(e) => setStudentAddress(e.target.value)}
            />
            <input
              type="text"
              placeholder="Student Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
            <input
              type="text"
              placeholder="IPFS Hash"
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
            />
          </div>
          <button
            className="action-button"
            onClick={issueCertificate}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Issue Certificate"}
          </button>
        </div>
      ) : (
        <div className="manage-certificates">
          <h2>Manage Certificates</h2>
          <div className="search-student">
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
              {isLoading ? "Loading..." : "Search"}
            </button>
          </div>

          {currentStudent && (
            <p className="current-student">
              Viewing certificates for: <code>{currentStudent}</code>
            </p>
          )}

          {certificates.length > 0 ? (
            <div className="certificates-list">
              {certificates.map((cert) => (
                <div key={cert.index} className="certificate-item">
                  <div className="certificate-info">
                    <h3>{cert.studentName}</h3>
                    <p>IPFS: {cert.ipfsHash}</p>
                    <p className={`status ${cert.isValid ? "valid" : "revoked"}`}>
                      Status: {cert.isValid ? "Valid" : "Revoked"}
                    </p>
                  </div>
                  {cert.isValid && (
                    <button
                      className="revoke-button"
                      onClick={() => revokeCertificate(cert.index)}
                      disabled={isLoading}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : currentStudent ? (
            <p className="no-certificates">No certificates found for this student</p>
          ) : null}
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
    <div className="app-container">
      <header className="app-header">
        <h1>🎓 Certificate System</h1>
        {account && (
          <div className="wallet-info">
            <span className="wallet-address">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
            {isUniversity && <span className="university-badge">UNIVERSITY</span>}
          </div>
        )}
      </header>

      <main className="app-main">
        {isLoading ? (
          <div className="loading">Loading blockchain data...</div>
        ) : !account ? (
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet
          </button>
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