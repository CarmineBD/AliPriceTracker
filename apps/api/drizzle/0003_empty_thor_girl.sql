CREATE TABLE "external_sessions" (
	"provider" varchar(50) PRIMARY KEY NOT NULL,
	"encrypted_cookie_jar" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
