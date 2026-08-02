const mongoose = require('mongoose');
const dns = require('dns');

// Set public DNS to resolve DNS queries over IPv6
dns.setServers(['2001:4860:4860::8888']);

const MONGO_URI = "mongodb+srv://leasify_admin:Leasify1278@cluster0.l8vz1gx.mongodb.net/leasify?appName=Cluster0";

// Custom lookup function that bypasses dns.lookup (system resolver)
function customLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  console.log(`Custom lookup called for: ${hostname}`);
  
  // Resolve using dns.resolve4 (which queries configured servers via UDP)
  dns.resolve4(hostname, (err, addresses) => {
    if (err) {
      console.error(`dns.resolve4 failed for ${hostname}:`, err.message);
      return callback(err);
    }
    if (!addresses || addresses.length === 0) {
      console.error(`dns.resolve4 returned no addresses for ${hostname}`);
      return callback(new Error(`ENOTFOUND ${hostname}`));
    }
    
    const ip = addresses[0];
    console.log(`Resolved ${hostname} -> ${ip}`);
    callback(null, ip, 4);
  });
}

console.log("Starting database connection test with custom lookup override...");

mongoose.connect(MONGO_URI, {
  // Pass custom lookup option to the MongoDB driver
  lookup: customLookup
})
  .then(() => {
    console.log("Connection successful!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection failed!");
    if (err.reason && err.reason.servers) {
      err.reason.servers.forEach((serverDescription, host) => {
        console.error(`Host: ${host}`);
        console.error(`Error details:`, serverDescription.error);
      });
    } else {
      console.error(err);
    }
    process.exit(1);
  });
