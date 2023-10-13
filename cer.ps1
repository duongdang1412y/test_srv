$password = Read-Host -AsSecureString -Prompt "Enter password"
$cert = New-SelfSignedCertificate -CertStoreLocation Cert:\CurrentUser\My -Subject "CN=Chromatic Digital CA, O=DevTrust, OU=Chromatic Trusted Certificate Service" -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 4096 -Provider "Microsoft Enhanced RSA and AES Cryptographic Provider" -NotAfter (Get-Date).AddDays(1032) -DnsName "8d404686.local" -FriendlyName "Chromatic CA"
Export-PfxCertificate -Cert $cert -FilePath C:\Users\Administrator\Desktop\CA.pfx -Password $password

# openssl pkcs12 -in CA.pfx -out chromatic.pem -nodes
# openssl rsa -in chromatic.pem -out chromatic_.key
# openssl rsa -des3 -in chromatic_.key -out chromatic.key
