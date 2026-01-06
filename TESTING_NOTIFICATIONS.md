# Notification System Testing Guide

## Overview
The notification system is now fully integrated with the ride service. Here's how to test it end-to-end.

## Services Status

### Check All Services Running
```powershell
netstat -ano | findstr ":300"
```

Should show:
- ✅ Port 3000: API Gateway
- ✅ Port 3001: User Service  
- ✅ Port 3002: Ride Service
- ✅ Port 3003: Notification Service

## Testing Flows

### 1. Test Notification Queue (Baseline)

**Check queue statistics:**
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
  -Method GET -UseBasicParsing
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

Expected response shows queue metrics (waiting, active, completed, failed jobs).

---

### 2. Test Direct Push Notification

**Send a test push:**
```powershell
$body = @{
  deviceToken = "test-device-123"
  title = "Test Ride Request"
  body = "New ride available nearby"
  data = @{
    rideId = "ride-123"
    fare = 350
  }
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3003/notifications/push" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body `
  -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

Expected: Job queued with ID in the result.

---

### 3. Test Ride Workflow Integration (Full E2E)

#### A. Rider Creates a Ride Request

```powershell
$rideBody = @{
  vehicleType = "economy"
  pickup = @{
    address = "123 Main Street, NYC"
    coordinates = @{
      lat = 40.7128
      lng = -74.0060
    }
  }
  dropoff = @{
    address = "456 Park Avenue, NYC"
    coordinates = @{
      lat = 40.7580
      lng = -73.9855
    }
  }
  paymentMethod = "card"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/request" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "rider-user-123"
  } `
  -Body $rideBody `
  -UseBasicParsing

$rideData = $response.Content | ConvertFrom-Json
$rideId = $rideData.ride._id
Write-Host "✅ Ride Created: $rideId"

# Check notification queue
Start-Sleep -Seconds 2
$statsResponse = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
  -Method GET -UseBasicParsing
Write-Host "Queue Status:"
$statsResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**What happens:**
- ✅ Ride created in database
- ✅ Socket broadcast to available drivers
- ✅ **NEW:** Push notification queued for notification service
- ✅ Notification joins queue with automatic retries (3 attempts, exponential backoff)

---

#### B. Driver Accepts Ride

```powershell
$rideId = "YOUR_RIDE_ID_FROM_ABOVE"

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/$rideId/accept" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "driver-user-456"
  } `
  -UseBasicParsing

$rideData = $response.Content | ConvertFrom-Json
Write-Host "✅ Ride Accepted"
Write-Host "Driver: $(($rideData.ride.driverId))"

# Check notification queue again
Start-Sleep -Seconds 2
$statsResponse = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
  -Method GET -UseBasicParsing
Write-Host "Queue Status after acceptance:"
$statsResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**What happens:**
- ✅ Ride status: `requested` → `accepted`
- ✅ Socket notification sent to rider
- ✅ **NEW:** Push notification queued to rider that driver accepted
- ✅ Job retries automatically if Firebase fails

---

#### C. Driver Updates Ride Status (Arriving)

```powershell
$rideId = "YOUR_RIDE_ID_FROM_ABOVE"

$statusBody = @{
  status = "arriving"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/$rideId/status" `
  -Method PUT `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "driver-user-456"
  } `
  -Body $statusBody `
  -UseBasicParsing

Write-Host "✅ Ride Status: Arriving"

# Check notifications
Start-Sleep -Seconds 2
$statsResponse = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
  -Method GET -UseBasicParsing
Write-Host "Queue Status:"
$statsResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Triggers notification:** `ride_arriving` to rider

---

#### D. Driver Starts Ride

```powershell
$statusBody = @{
  status = "in_progress"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/$rideId/status" `
  -Method PUT `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "driver-user-456"
  } `
  -Body $statusBody `
  -UseBasicParsing

Write-Host "✅ Ride Status: In Progress"
```

**Triggers notification:** `ride_in_progress` to rider

---

#### E. Driver Completes Ride

```powershell
$statusBody = @{
  status = "completed"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/$rideId/status" `
  -Method PUT `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "driver-user-456"
  } `
  -Body $statusBody `
  -UseBasicParsing

Write-Host "✅ Ride Status: Completed"

# Final notification queue check
Start-Sleep -Seconds 2
$statsResponse = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
  -Method GET -UseBasicParsing
Write-Host "Final Queue Status:"
$statsResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Triggers notification:** `ride_completed` to rider

---

#### F. Cancel Ride (Optional Test)

```powershell
$rideId = "YOUR_RIDE_ID_FROM_ABOVE"

$cancelBody = @{
  reason = "Driver going offline"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/rides/$rideId/cancel" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "x-user-id" = "driver-user-456"
  } `
  -Body $cancelBody `
  -UseBasicParsing

Write-Host "✅ Ride Cancelled"
```

**Triggers notification:** `ride_cancelled` to rider (if driver cancelled) or driver (if rider cancelled)

---

## Using Postman (Recommended)

### Setup Collection

1. Import: `postman/Uber-Clone-API.postman_collection.json`
2. Add these requests:

#### Request 1: Check Queue Stats
```
GET http://localhost:3003/notifications/stats
```

#### Request 2: Create Ride (with Rider ID header)
```
POST http://localhost:3000/api/rides/request
Header: x-user-id: rider-user-123
Body:
{
  "vehicleType": "economy",
  "pickup": {
    "address": "123 Main Street",
    "coordinates": {"lat": 40.7128, "lng": -74.0060}
  },
  "dropoff": {
    "address": "456 Park Avenue",
    "coordinates": {"lat": 40.7580, "lng": -73.9855}
  },
  "paymentMethod": "card"
}
```

#### Request 3: Accept Ride (with Driver ID header)
```
POST http://localhost:3000/api/rides/{{rideId}}/accept
Header: x-user-id: driver-user-456
```

#### Request 4: Update Ride Status
```
PUT http://localhost:3000/api/rides/{{rideId}}/status
Header: x-user-id: driver-user-456
Body:
{
  "status": "arriving"  // or "in_progress", "completed", "cancelled"
}
```

---

## What Gets Sent to Firebase

When a notification is queued, it contains:

```json
{
  "type": "ride_accepted",
  "userId": "rider-user-123",
  "data": {
    "rideId": "65f123abc...",
    "driverId": "driver-user-456",
    "status": "Driver accepted your ride",
    "eta": 5
  }
}
```

The notification service then:
1. ✅ Queues the job in Redis with 3 automatic retries
2. ✅ Sends to Firebase Cloud Messaging
3. ✅ Firebase delivers to iOS/Android devices
4. ✅ Stores completion status in queue

---

## Queue Reliability Features

- **Automatic Retries:** 3 attempts with exponential backoff (2s, 4s, 8s)
- **Persistent Storage:** Redis persists queued jobs (Cloud Redis)
- **Error Handling:** Failed jobs tracked but don't block other notifications
- **Graceful Fallback:** If Firebase unavailable, mocks send locally (dev mode)

---

## Monitoring

### Real-time Queue Monitoring
```powershell
# Watch queue in real-time
while($true) {
  $stats = Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" `
    -Method GET -UseBasicParsing
  Clear-Host
  $stats.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
  Start-Sleep -Seconds 3
}
```

### Check Ride Service Logs
Look for messages like:
```
Failed to send ride accepted notification: Error details...
```

### Check Notification Service Logs
Look for:
```
📬 Push notification queue initialized
🔥 Firebase Admin SDK initialized successfully
📤 Push notification sent: messageId=...
```

---

## Integration Summary

### Code Changes Made

**ride-service/src/controllers/rideController.js:**
- ✅ `requestRide()`: Sends notification when rider creates ride
- ✅ `acceptRide()`: Sends notification to rider when driver accepts
- ✅ `updateRideStatus()`: Sends notifications for arriving/in_progress/completed
- ✅ `cancelRide()`: Sends notifications to other party when cancelled

### Environment Variables

**ride-service/.env:**
```
NOTIFICATION_SERVICE_URL=http://localhost:3003
```

**notification-service/.env:**
```
NOTIFICATION_SERVICE_URL=http://localhost:3003
REDIS_URL=redis://default:...@redis-host:port
FCM_SERVICE_ACCOUNT_KEY=./firebase-key.json
FCM_PROJECT_ID=uclone-6c0f0
```

---

## Troubleshooting

### Issue: Notifications not being sent

**Check 1:** Is notification service running?
```powershell
Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" -UseBasicParsing
```

**Check 2:** Is Redis connected?
Look for in notification-service logs:
```
❌ Redis connection failed
```

**Check 3:** Are notifications being queued?
```powershell
# Should show completed jobs increasing
Invoke-WebRequest -Uri "http://localhost:3003/notifications/stats" -UseBasicParsing
```

**Check 4:** Is Firebase configured?
Look for:
```
🔥 Firebase Admin SDK initialized successfully
```
If not, Firebase is in mock mode (fine for testing).

### Issue: High failure rate in queue

**Check:** Firebase credentials validity
- Verify `firebase-key.json` has valid credentials
- Check project ID matches in `.env`
- Verify service account has Cloud Messaging permissions

---

## Next Steps

1. ✅ Test all ride status transitions above
2. ✅ Verify notifications appear in Firebase Console
3. ✅ Add device tokens from actual Firebase installations
4. ✅ Test with real iOS/Android apps
5. ✅ Monitor queue metrics in production
