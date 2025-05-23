$output = & npx prisma db push --accept-data-loss 2>&1
$output | Out-File -FilePath "db-push-output.txt"
