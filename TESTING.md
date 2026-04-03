# Project Test Commands

Use the commands below to run and verify the project end to end from Windows PowerShell.

## 1. Start the stack

```powershell
docker compose up --build -d
```

## 2. Check service status

```powershell
docker compose ps
```

## 3. Verify the API health endpoint

```powershell
Invoke-RestMethod http://localhost:3000/health
```

## 4. Check seeded documents in MongoDB

```powershell
docker exec wiki_mongo mongosh wikidocs --eval "print(db.documents.countDocuments())"
```

## 5. Verify indexes exist

```powershell
docker exec wiki_mongo mongosh wikidocs --eval "printjson(db.documents.getIndexes())"
```

## 6. Create a document

```powershell
$body = @{
  title = 'PowerShell Test Doc'
  content = 'This is a test document created from PowerShell.'
  tags = @('mongodb', 'guide')
  authorName = 'Tester'
  authorEmail = 'tester@example.com'
}

Invoke-RestMethod `
  -Uri http://localhost:3000/api/documents `
  -Method Post `
  -ContentType 'application/json' `
  -Body ($body | ConvertTo-Json -Depth 10)
```

## 7. Read a document by slug

Replace the slug with one returned from the create call.

```powershell
Invoke-RestMethod http://localhost:3000/api/documents/your-slug-here
```

## 8. Update a document with OCC

Replace the slug and version with values from the document you read.

```powershell
$update = @{
  title = 'PowerShell Test Doc v2'
  content = 'Updated content for OCC testing.'
  version = 1
}

Invoke-RestMethod `
  -Uri http://localhost:3000/api/documents/your-slug-here `
  -Method Put `
  -ContentType 'application/json' `
  -Body ($update | ConvertTo-Json -Depth 10)
```

## 9. Test an OCC conflict

```powershell
$stale = @{
  title = 'Stale Update'
  content = 'This should trigger a conflict.'
  version = 1
}

try {
  Invoke-RestMethod `
    -Uri http://localhost:3000/api/documents/your-slug-here `
    -Method Put `
    -ContentType 'application/json' `
    -Body ($stale | ConvertTo-Json -Depth 10)
} catch {
  $_.Exception.Response.StatusCode.value__
}
```

## 10. Run search

```powershell
Invoke-RestMethod 'http://localhost:3000/api/search?q=collaborative'
```

## 11. Run search with tag filtering

```powershell
Invoke-RestMethod 'http://localhost:3000/api/search?q=mongo&tags=guide'
```

## 12. Run analytics endpoints

```powershell
Invoke-RestMethod http://localhost:3000/api/analytics/most-edited
Invoke-RestMethod http://localhost:3000/api/analytics/tag-cooccurrence
```

## 13. Verify lazy schema migration

```powershell
Invoke-RestMethod http://localhost:3000/api/documents/vagrant-0-0-0
```

## 14. Run the migration script manually

```powershell
$env:MONGO_URI='mongodb://localhost:27017'; npm run migrate
```

If you run the script from inside the Docker network instead of from the host, you can keep the default `MONGO_URI` value from `.env`.

## 15. Stop the stack

```powershell
docker compose down
```
