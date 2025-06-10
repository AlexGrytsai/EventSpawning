**Task Overview:**

-   **Build a simple and efficient system** that handles event spawning (from given docker image), data processing, and reporting.
-   **Focus on scalability and maintainability** throughout your solution.
-   **Additional integrations:** Connect with external messaging systems like NATS JetStream.
-   **Implementation requirements:** Create comprehensive API endpoints, implement logging, monitoring, and testing best practices.
-   **Deployment:** Ensure your application gracefully handles lifecycle events and supports multi-environment configuration via docker-compose.

**Requirements**
- the app runs with single command
- `gateway` receives webhook events from `publisher` (given docker image) via http (you need to pass env variable `EVENT_ENDPOINT`) and adds to corresponding nats jet stream topics
- `collectors` process events and store them to db
- `reporter` provides api for generating reports:
    - GET `/reports/events` - returns aggregated event statistics with optional filters:
        -  `from` and `to` (time range)
           -   `source` (Facebook or Tiktok)
           -   `funnelStage` (top or bottom)
           -   `eventType` (specific event type)
    - GET `/reports/revenue` - returns aggregated revenue data from transactional events (e.g., Facebook's `checkout.complete` or Tiktok's `purchase`) with filters:
        - `from` and `to`
        -   `source`
        -   (optionally) `campaignId`
    - GET `/reports/demographics` - returns user demographic data with filters:
        - `from`end and `to`
        -   `source`
            *For Facebook: includes age, gender, and location                
            For Tiktok: includes follower counts and other metrics*
        -   `grafana` provides charts with panels:
        -   `gateway`:
            -   accepted events (stat)
            -   processed events (stat)
            -   failed events (stat)
        -   `collectors`:
            -   aggregated rate per 1 minute: same metrics as in `gateway` charts are stacked one above another (time series)
        -   `reporter`:
            -   reports latency by category (time series)

**Additional requirements**
-   on application or docker-compose restart, data from the previous run remains intact
-   gateway and collectors use custom nestjs wrappers on top of nats
-   implement structured logging with correlation IDs to trace events across services
-   each service should expose liveness and readiness endpoints for monitoring
-   ensure the application processes in-flight events before terminating on shutdown
-   automatically run Prisma migrations on startup to keep the DB schema up-to-date
-   include comprehensive unit and integration tests for key functionalities
-   design the architecture so that gateway and collectors can be horizontally scaled if needed
-   support configuration for multiple environments (development, staging, production) via docker-compose and environment variables
-   docker-compose should start only if all services are healthy

**Docker-compose**
base services:
- publisher (docker hub:[andriiuni/events](https://hub.docker.com/r/andriiuni/events))
- gateway
- fb-collector
- ttk-collector
- reporter
- prometheus
- grafana

**Stack**
-   TS
-   NestJS
-   nats-io/nats.js
-   PostgreSQL
-   Prisma
-   Zod validation
-   Prometheus + Grafana
-   docker-compose

**Event types**
```js
export type FunnelStage = "top" | "bottom";

export type FacebookTopEventType = "ad.view" | "page.like" | "comment" | "video.view";
export type FacebookBottomEventType = "ad.click" | "form.submission" | "checkout.complete";
export type FacebookEventType = FacebookTopEventType | FacebookBottomEventType;

export interface FacebookUserLocation {
  country: string;
  city: string;
}

export interface FacebookUser {
  userId: string;
  name: string;
  age: number;
  gender: "male" | "female" | "non-binary";
  location: FacebookUserLocation;
}

export interface FacebookEngagementTop {
  actionTime: string;
  referrer: "newsfeed" | "marketplace" | "groups";
  videoId: string | null;
}

export interface FacebookEngagementBottom {
  adId: string;
  campaignId: string;
  clickPosition: "top_left" | "bottom_right" | "center";
  device: "mobile" | "desktop";
  browser: "Chrome" | "Firefox" | "Safari";
  purchaseAmount: string | null;
}

export type FacebookEngagement = FacebookEngagementTop | FacebookEngagementBottom;

export interface FacebookEvent {
  eventId: string;
  timestamp: string;
  source: "facebook";
  funnelStage: FunnelStage;
  eventType: FacebookEventType;
  data: {
    user: FacebookUser;
    engagement: FacebookEngagement;
  };
}

export type TiktokTopEventType = "video.view" | "like" | "share" | "comment";
export type TiktokBottomEventType = "profile.visit" | "purchase" | "follow";
export type TiktokEventType = TiktokTopEventType | TiktokBottomEventType;

export interface TiktokUser {
  userId: string;
  username: string;
  followers: number;
}

export interface TiktokEngagementTop {
  watchTime: number;
  percentageWatched: number;
  device: "Android" | "iOS" | "Desktop";
  country: string;
  videoId: string;
}

export interface TiktokEngagementBottom {
  actionTime: string;
  profileId: string | null;
  purchasedItem: string | null;
  purchaseAmount: string | null;
}

export type TiktokEngagement = TiktokEngagementTop | TiktokEngagementBottom;

export interface TiktokEvent {
  eventId: string;
  timestamp: string;
  source: "tiktok";
  funnelStage: FunnelStage;
  eventType: TiktokEventType;
  data: {
    user: TiktokUser;
    engagement: TiktokEngagement;
  };
}

export type Event = FacebookEvent | TiktokEvent;

```
**Envs**
`EVENT_ENDPOINT` - env variable required by `publisher` to send webhooks