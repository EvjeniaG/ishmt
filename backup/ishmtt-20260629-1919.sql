--
-- PostgreSQL database dump
--

\restrict OqwUTcJ1pRV5HXoGaq76RmSOoJIhLmn55vkvwffap1cF5ez1Inm02EN8E5spMiU

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_status AS ENUM (
    'DRAFT',
    'BASIC_DATA_COMPLETED',
    'PENDING_INSTALLER',
    'INSTALLER_INVITED',
    'INSTALLER_ACCEPTED',
    'TECHNICAL_DATA_IN_PROGRESS',
    'TECHNICAL_DATA_COMPLETED',
    'INSTALLER_COMPLETED',
    'PENDING_CERTIFIER',
    'CERTIFIER_INVITED',
    'CERTIFIER_ACCEPTED',
    'CERTIFICATION_IN_PROGRESS',
    'CERTIFICATION_COMPLETED',
    'CERTIFICATION_COMPLETED_WITH_ISSUES',
    'PENDING_OWNER_SUBMISSION',
    'SUBMITTED',
    'UNDER_REVIEW',
    'PENDING_CHIEF_INSPECTOR',
    'RETURNED',
    'REJECTED',
    'APPROVED',
    'ELEVATOR_CREATED',
    'ASSETS_GENERATED',
    'CLOSED',
    'CANCELLED',
    'EXPIRED'
);


--
-- Name: app_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_type AS ENUM (
    'NEW_REGISTRATION',
    'DEREGISTRATION',
    'DATA_CORRECTION',
    'DATA_UPDATE',
    'MODERNIZATION'
);


--
-- Name: asset_generation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_generation_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED'
);


--
-- Name: audit_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.audit_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'STATUS_CHANGE',
    'DOCUMENT_UPLOAD',
    'DOCUMENT_DOWNLOAD',
    'LOGIN',
    'LOGOUT',
    'WORKFLOW_TRANSITION',
    'IMPORT',
    'ROLLBACK',
    'PERMISSION_DENIED',
    'VIEW_SENSITIVE_RECORD',
    'DOWNLOAD_DOCUMENT'
);


--
-- Name: building_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.building_type AS ENUM (
    'CO_OWNERSHIP_BUILDING',
    'WORKPLACE',
    'RESIDENTIAL',
    'PUBLIC_BUILDING',
    'SHOPPING_CENTER',
    'OTHER'
);


--
-- Name: cert_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cert_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'REVOKED',
    'SUPERSEDED'
);


--
-- Name: cert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cert_type AS ENUM (
    'INSTALLATION',
    'REGISTRATION',
    'PERIODIC_INSPECTION',
    'CONFORMITY'
);


--
-- Name: cit_report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cit_report_status AS ENUM (
    'SUBMITTED',
    'TRIAGED',
    'ASSIGNED',
    'INVESTIGATING',
    'RESOLVED',
    'DISMISSED'
);


--
-- Name: cit_report_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cit_report_type AS ENUM (
    'NO_QR',
    'SAFETY_ISSUE',
    'COMPLAINT'
);


--
-- Name: compliance_indicator; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.compliance_indicator AS ENUM (
    'GREEN',
    'YELLOW',
    'RED'
);


--
-- Name: conformity_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conformity_result AS ENUM (
    'CONFORM',
    'NON_CONFORM',
    'CONDITIONAL'
);


--
-- Name: data_update_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.data_update_type AS ENUM (
    'RESPONSIBLE_ENTITY_CHANGE',
    'MAINTENANCE_COMPANY_CHANGE',
    'ADDRESS_CHANGE',
    'CONTACT_UPDATE',
    'OWNERSHIP_TRANSFER',
    'SERIAL_NUMBER_CHANGE'
);


--
-- Name: delegation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delegation_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REVOKED',
    'EXPIRED',
    'INVITED',
    'REJECTED'
);


--
-- Name: delegation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delegation_type AS ENUM (
    'INSTALLER',
    'CERTIFIER',
    'MAINTENANCE',
    'OWNERSHIP_RECIPIENT'
);


--
-- Name: deregistration_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deregistration_reason AS ENUM (
    'PERMANENTLY_DISMANTLED',
    'REPLACED_BY_NEW_UNIT',
    'STRUCTURAL_CHANGES',
    'OTHER'
);


--
-- Name: doc_access_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.doc_access_action AS ENUM (
    'VIEW',
    'DOWNLOAD'
);


--
-- Name: doc_classification; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.doc_classification AS ENUM (
    'APPLICATION',
    'TECHNICAL',
    'CERTIFICATE',
    'INSPECTION_REPORT',
    'MAINTENANCE_LOG',
    'INTERNAL_ISHMT',
    'CITIZEN_REPORT',
    'OTHER'
);


--
-- Name: elv_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.elv_status AS ENUM (
    'PENDING_CONFIRMATION',
    'ACTIVE',
    'SUSPENDED',
    'DEREGISTERED',
    'UNVERIFIED',
    'PENDING_REGISTRATION',
    'REGISTERED',
    'UNDER_INSPECTION',
    'EXPIRED_CERTIFICATION',
    'MAINTENANCE_OVERDUE',
    'OUT_OF_SERVICE'
);


--
-- Name: elv_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.elv_type AS ENUM (
    'PASSENGER',
    'FREIGHT',
    'SERVICE',
    'HANDICAPPED',
    'ESCALATOR',
    'MOVING_WALK'
);


--
-- Name: field_insp_assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.field_insp_assignment_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: incident_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: incident_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_source AS ENUM (
    'CITIZEN',
    'OWNER',
    'MAINTENANCE',
    'ISHMT',
    'INSPECTOR',
    'OTHER'
);


--
-- Name: incident_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'ASSIGNED_TO_MAINTENANCE',
    'ASSIGNED_TO_INSPECTOR',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: incident_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.incident_type AS ENUM (
    'TECHNICAL_DEFECT',
    'ELEVATOR_STUCK',
    'WORK_STOPPAGE',
    'SAFETY_ISSUE',
    'INCIDENT',
    'ACCIDENT',
    'PERSON_INJURY',
    'PROPERTY_DAMAGE',
    'OTHER'
);


--
-- Name: insp_result; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.insp_result AS ENUM (
    'PASS',
    'FAIL',
    'CONDITIONAL',
    'PENDING'
);


--
-- Name: insp_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.insp_type AS ENUM (
    'INITIAL',
    'PERIODIC',
    'EXTRAORDINARY',
    'RE_INSPECTION'
);


--
-- Name: invitation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invitation_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);


--
-- Name: job_run_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_run_status AS ENUM (
    'STARTED',
    'COMPLETED',
    'FAILED'
);


--
-- Name: maint_contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maint_contract_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'REJECTED',
    'EXPIRED',
    'TERMINATED'
);


--
-- Name: maint_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maint_type AS ENUM (
    'ROUTINE',
    'ANNUAL_SERVICE',
    'EMERGENCY',
    'MODERNIZATION'
);


--
-- Name: modernization_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.modernization_type AS ENUM (
    'MOTOR_CHANGE',
    'CONTROL_PANEL_CHANGE',
    'CABIN_CHANGE',
    'SAFETY_SYSTEM_CHANGE',
    'ELECTRICAL_SYSTEM_CHANGE',
    'OTHER'
);


--
-- Name: notif_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notif_channel AS ENUM (
    'IN_APP',
    'EMAIL',
    'SMS'
);


--
-- Name: notif_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notif_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'READ'
);


--
-- Name: org_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'REVOKED',
    'PENDING_VALIDATION',
    'ACTIVE_AUTHORIZED',
    'REJECTED',
    'EXPIRED',
    'INACTIVE'
);


--
-- Name: org_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_type AS ENUM (
    'ISHMT',
    'DIRECTORATE',
    'INSTALLER',
    'CERTIFIER',
    'MAINTENANCE',
    'OWNER'
);


--
-- Name: owner_building_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.owner_building_role AS ENUM (
    'ADMINISTRATOR',
    'OWNERS_ASSEMBLY_REP',
    'CONSTRUCTOR',
    'OTHER',
    'PHYSICAL_PERSON',
    'LEGAL_PERSON',
    'CONSTRUCTION_COMPANY'
);


--
-- Name: qkb_validation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.qkb_validation_status AS ENUM (
    'PENDING',
    'VALID',
    'INVALID',
    'ERROR'
);


--
-- Name: reminder_entity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reminder_entity_type AS ENUM (
    'INSPECTION',
    'CERTIFICATE',
    'MAINTENANCE_CONTRACT'
);


--
-- Name: report_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


--
-- Name: return_target_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.return_target_role AS ENUM (
    'OWNER',
    'INSTALLER',
    'CERTIFIER'
);


--
-- Name: suspension_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.suspension_reason AS ENUM (
    'EXPIRED_INSPECTION',
    'EXPIRED_CERTIFICATE',
    'EXPIRED_MAINTENANCE',
    'SAFETY_RISK',
    'CITIZEN_REPORT',
    'ADMINISTRATIVE_DECISION'
);


--
-- Name: template_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.template_type AS ENUM (
    'CERTIFICATE',
    'REPORT',
    'OFFICIAL_LETTER'
);


--
-- Name: usage_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usage_purpose AS ENUM (
    'ELECTRIC_PASSENGER',
    'HYDRAULIC_PASSENGER',
    'PASSENGER_AND_FREIGHT',
    'PASSENGER_AND_BED',
    'PASSENGER_AND_MOTOR_DEVICE',
    'OTHER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_application_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_application_data (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    building_address text,
    municipality_id uuid,
    administrative_unit_id uuid,
    building_name character varying(255),
    gps_latitude numeric(10,7),
    gps_longitude numeric(10,7),
    elevator_type public.elv_type,
    manufacturer character varying(255),
    model character varying(255),
    serial_number character varying(100),
    manufacturing_year integer,
    capacity_kg integer,
    capacity_persons integer,
    speed_ms numeric(5,2),
    floors_served integer,
    stops integer,
    drive_type character varying(50),
    additional_technical jsonb,
    correction_fields jsonb,
    update_fields jsonb,
    deregistration_reason text,
    modernization_notes text,
    updated_at timestamp with time zone NOT NULL,
    certifier_notes text,
    installation_certificate_date date,
    installation_certificate_number character varying(50),
    certificate_reference character varying(50),
    certifier_technical_notes text,
    conformity_result public.conformity_result,
    examination_date date,
    examination_type character varying(50),
    omi_number character varying(50),
    building_type public.building_type,
    deregistration_reason_type public.deregistration_reason,
    entrance character varying(100),
    floor_location character varying(100),
    modernization_type public.modernization_type,
    notes text,
    responsible_entity_email character varying(255),
    responsible_entity_identifier character varying(30),
    responsible_entity_name character varying(255),
    responsible_entity_phone character varying(20),
    update_type public.data_update_type,
    usage_purpose public.usage_purpose,
    application_date date,
    legacy_district_code character varying(10),
    registration_extended_data jsonb,
    specific_position character varying(255)
);


--
-- Name: app_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_applications (
    id uuid NOT NULL,
    application_number character varying(30) NOT NULL,
    type public.app_type NOT NULL,
    status public.app_status DEFAULT 'DRAFT'::public.app_status NOT NULL,
    owner_org_id uuid NOT NULL,
    installer_org_id uuid,
    certifier_org_id uuid,
    elevator_id uuid,
    assigned_inspector_id uuid,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    approved_at timestamp with time zone,
    rejected_at timestamp with time zone,
    rejection_reason text,
    return_reason text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid NOT NULL,
    required_correction text,
    return_to_role public.return_target_role,
    asset_generation_completed_at timestamp with time zone,
    asset_generation_error text,
    asset_generation_status public.asset_generation_status DEFAULT 'PENDING'::public.asset_generation_status NOT NULL,
    returned_at timestamp with time zone,
    returned_by uuid,
    return_to_roles jsonb
);


--
-- Name: app_delegations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_delegations (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    access_type public.delegation_type NOT NULL,
    status public.delegation_status DEFAULT 'PENDING'::public.delegation_status NOT NULL,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_at timestamp with time zone,
    expires_at timestamp with time zone
);


--
-- Name: app_workflow_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_workflow_history (
    id uuid NOT NULL,
    application_id uuid NOT NULL,
    from_status public.app_status,
    to_status public.app_status NOT NULL,
    action character varying(50) NOT NULL,
    actor_id uuid NOT NULL,
    comment text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    actor_id uuid,
    action public.audit_action NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    before_state jsonb,
    after_state jsonb,
    metadata jsonb,
    ip_address character varying(45),
    user_agent text,
    correlation_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_accounts (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    provider_account_id text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: auth_password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_password_reset_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: auth_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permissions (
    id uuid NOT NULL,
    code character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    description text
);


--
-- Name: auth_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: auth_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_roles (
    id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id uuid NOT NULL,
    session_token text NOT NULL,
    user_id uuid NOT NULL,
    expires timestamp with time zone NOT NULL
);


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone character varying(20),
    nid character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    failed_login_count integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    birth_date date,
    father_name character varying(100),
    id_card_number character varying(20),
    mother_name character varying(100),
    pending_email character varying(255),
    two_factor_enabled boolean DEFAULT false NOT NULL,
    two_factor_secret character varying(64)
);


--
-- Name: auth_verification_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp with time zone NOT NULL
);


--
-- Name: cert_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cert_certificates (
    id uuid NOT NULL,
    certificate_number character varying(30) NOT NULL,
    elevator_id uuid NOT NULL,
    type public.cert_type NOT NULL,
    status public.cert_status DEFAULT 'ACTIVE'::public.cert_status NOT NULL,
    issued_date date NOT NULL,
    expiry_date date,
    issued_by_org_id uuid,
    issued_by_user_id uuid,
    application_id uuid,
    inspection_id uuid,
    document_id uuid,
    superseded_by_id uuid,
    revoked_at timestamp with time zone,
    revoked_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: cit_report_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cit_report_actions (
    id uuid NOT NULL,
    report_id uuid NOT NULL,
    action character varying(50) NOT NULL,
    actor_id uuid NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cit_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cit_reports (
    id uuid NOT NULL,
    report_number character varying(20) NOT NULL,
    type public.cit_report_type NOT NULL,
    status public.cit_report_status DEFAULT 'SUBMITTED'::public.cit_report_status NOT NULL,
    reporter_user_id uuid,
    reporter_name character varying(100),
    reporter_email character varying(255),
    reporter_phone character varying(20),
    elevator_id uuid,
    location_address text,
    municipality_id uuid,
    gps_latitude numeric(10,7),
    gps_longitude numeric(10,7),
    description text NOT NULL,
    priority public.report_priority DEFAULT 'NORMAL'::public.report_priority NOT NULL,
    assigned_inspector_id uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: doc_access_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doc_access_log (
    id uuid NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    action public.doc_access_action NOT NULL,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: doc_document_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doc_document_links (
    id uuid NOT NULL,
    document_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    purpose character varying(50)
);


--
-- Name: doc_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doc_documents (
    id uuid NOT NULL,
    filename character varying(255) NOT NULL,
    original_filename character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    storage_path character varying(500) NOT NULL,
    checksum_sha256 character varying(64) NOT NULL,
    classification public.doc_classification NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: doc_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doc_templates (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type public.template_type NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    description text,
    content text,
    storage_path character varying(500),
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: elv_compliance_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_compliance_status (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    indicator public.compliance_indicator DEFAULT 'GREEN'::public.compliance_indicator NOT NULL,
    inspection_valid boolean DEFAULT true NOT NULL,
    certificate_valid boolean DEFAULT true NOT NULL,
    maintenance_valid boolean DEFAULT true NOT NULL,
    inspection_expiring boolean DEFAULT false NOT NULL,
    certificate_expiring boolean DEFAULT false NOT NULL,
    maintenance_expiring boolean DEFAULT false NOT NULL,
    is_suspended boolean DEFAULT false NOT NULL,
    last_calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: elv_delegation_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_delegation_history (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    delegation_type public.delegation_type NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    status public.delegation_status DEFAULT 'PENDING'::public.delegation_status NOT NULL
);


--
-- Name: elv_elevators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_elevators (
    id uuid NOT NULL,
    registry_number character varying(30) NOT NULL,
    application_id uuid NOT NULL,
    status public.elv_status DEFAULT 'ACTIVE'::public.elv_status NOT NULL,
    owner_org_id uuid NOT NULL,
    installer_org_id uuid NOT NULL,
    certifier_org_id uuid NOT NULL,
    maintenance_org_id uuid,
    building_address text NOT NULL,
    municipality_id uuid NOT NULL,
    administrative_unit_id uuid,
    building_name character varying(255),
    gps_latitude numeric(10,7),
    gps_longitude numeric(10,7),
    registration_date date NOT NULL,
    activation_date date,
    deregistration_date date,
    deregistration_reason text,
    confirmed_at timestamp with time zone,
    confirmed_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    requires_attention boolean DEFAULT false NOT NULL,
    building_id uuid
);


--
-- Name: elv_ownership_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_ownership_history (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    old_owner_id uuid NOT NULL,
    new_owner_id uuid NOT NULL,
    change_date date NOT NULL,
    application_id uuid,
    reason text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: elv_responsible_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_responsible_entities (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role public.org_type NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    application_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: elv_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_status_history (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    from_status public.elv_status,
    to_status public.elv_status NOT NULL,
    reason text,
    suspension_reason public.suspension_reason,
    application_id uuid,
    actor_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: elv_technical_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_technical_data (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    elevator_type public.elv_type NOT NULL,
    manufacturer character varying(255) NOT NULL,
    model character varying(255),
    serial_number character varying(100) NOT NULL,
    manufacturing_year integer,
    capacity_kg integer,
    capacity_persons integer,
    speed_ms numeric(5,2),
    floors_served integer NOT NULL,
    stops integer,
    drive_type character varying(50),
    door_type character varying(50),
    control_system character varying(100),
    additional_data jsonb,
    current_version_id uuid,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: elv_technical_data_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.elv_technical_data_versions (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    application_id uuid,
    version_number integer NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    elevator_type public.elv_type NOT NULL,
    manufacturer character varying(255) NOT NULL,
    model character varying(255),
    serial_number character varying(100) NOT NULL,
    manufacturing_year integer,
    capacity_kg integer,
    capacity_persons integer,
    speed_ms numeric(5,2),
    floors_served integer NOT NULL,
    stops integer,
    drive_type character varying(50),
    door_type character varying(50),
    control_system character varying(100),
    additional_data jsonb,
    change_reason text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: geo_administrative_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_administrative_units (
    id uuid NOT NULL,
    municipality_id uuid NOT NULL,
    code character varying(20) NOT NULL,
    name_sq character varying(100) NOT NULL,
    name_en character varying(100),
    unit_type character varying(50),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: geo_buildings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_buildings (
    id uuid NOT NULL,
    building_code character varying(30),
    name character varying(255),
    address text NOT NULL,
    municipality_id uuid NOT NULL,
    administrative_unit_id uuid,
    building_type public.building_type,
    entrance character varying(100),
    floors_count integer,
    gps_latitude numeric(10,7),
    gps_longitude numeric(10,7),
    primary_owner_org_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: geo_municipalities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_municipalities (
    id uuid NOT NULL,
    region_id uuid NOT NULL,
    code character varying(10) NOT NULL,
    name_sq character varying(100) NOT NULL,
    name_en character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    legacy_registry_code character varying(5)
);


--
-- Name: geo_regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_regions (
    id uuid NOT NULL,
    code character varying(10) NOT NULL,
    name_sq character varying(100) NOT NULL,
    name_en character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incidents (
    id uuid NOT NULL,
    incident_number character varying(20) NOT NULL,
    elevator_id uuid NOT NULL,
    source public.incident_source NOT NULL,
    type public.incident_type NOT NULL,
    description text NOT NULL,
    priority public.incident_priority DEFAULT 'MEDIUM'::public.incident_priority NOT NULL,
    status public.incident_status DEFAULT 'OPEN'::public.incident_status NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    reported_by_id uuid,
    reporter_name character varying(100),
    reporter_contact character varying(255),
    assigned_to_id uuid,
    photos jsonb,
    resolution_notes text,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: insp_field_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insp_field_assignments (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    assignee_id uuid NOT NULL,
    assigned_by_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    status public.field_insp_assignment_status DEFAULT 'SCHEDULED'::public.field_insp_assignment_status NOT NULL,
    instructions text,
    inspection_id uuid,
    cancelled_at timestamp with time zone,
    cancel_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: insp_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insp_inspections (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    inspector_id uuid NOT NULL,
    type public.insp_type NOT NULL,
    status public.insp_result DEFAULT 'PENDING'::public.insp_result NOT NULL,
    scheduled_date date NOT NULL,
    conducted_date date,
    result public.insp_result,
    findings text,
    conditions text,
    next_inspection_date date,
    report_document_id uuid,
    certificate_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    approved_body_number character varying(50),
    examination_type character varying(50)
);


--
-- Name: maint_compliance_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maint_compliance_status (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    last_maintenance_date date,
    next_due_date date,
    is_compliant boolean DEFAULT true NOT NULL,
    days_overdue integer DEFAULT 0 NOT NULL,
    last_calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: maint_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maint_contracts (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    maintenance_org_id uuid NOT NULL,
    contract_number character varying(50),
    start_date date NOT NULL,
    end_date date,
    application_id uuid,
    document_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    service_type character varying(30) DEFAULT 'MAINTENANCE'::character varying NOT NULL,
    rejection_reason text,
    responded_at timestamp with time zone,
    status public.maint_contract_status DEFAULT 'PENDING'::public.maint_contract_status NOT NULL
);


--
-- Name: maint_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maint_records (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    maintenance_org_id uuid NOT NULL,
    type public.maint_type NOT NULL,
    performed_date date NOT NULL,
    technician_name character varying(100),
    description text,
    findings text,
    next_due_date date,
    document_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    duration_minutes integer,
    end_time character varying(5),
    intervention_type character varying(40),
    parts_replaced text,
    start_time character varying(5)
);


--
-- Name: org_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_invitations (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    role_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    status public.invitation_status DEFAULT 'PENDING'::public.invitation_status NOT NULL,
    invited_by uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by uuid,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: org_licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_licenses (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    license_number character varying(50) NOT NULL,
    license_type character varying(50) NOT NULL,
    issued_date date NOT NULL,
    expiry_date date NOT NULL,
    scope text,
    status public.org_status DEFAULT 'ACTIVE'::public.org_status NOT NULL,
    issued_by character varying(255),
    document_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    created_by uuid
);


--
-- Name: org_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_memberships (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deactivated_at timestamp with time zone
);


--
-- Name: org_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_organizations (
    id uuid NOT NULL,
    type public.org_type NOT NULL,
    name character varying(255) NOT NULL,
    nipt character varying(20),
    legal_form character varying(100),
    address text,
    municipality_id uuid,
    phone character varying(20),
    email character varying(255),
    status public.org_status DEFAULT 'ACTIVE'::public.org_status NOT NULL,
    qkb_validated boolean DEFAULT false NOT NULL,
    qkb_validated_at timestamp with time zone,
    qkb_validation_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by uuid,
    owner_building_role public.owner_building_role,
    representative_email character varying(255),
    representative_name character varying(255),
    representative_nid character varying(20),
    representative_phone character varying(20)
);


--
-- Name: org_qkb_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_qkb_validations (
    id uuid NOT NULL,
    organization_id uuid NOT NULL,
    nipt character varying(20) NOT NULL,
    request_data jsonb,
    response_data jsonb,
    status public.qkb_validation_status NOT NULL,
    validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    initiated_by uuid NOT NULL
);


--
-- Name: qr_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_codes (
    id uuid NOT NULL,
    elevator_id uuid NOT NULL,
    code character varying(12) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deactivated_at timestamp with time zone,
    scan_count integer DEFAULT 0 NOT NULL,
    image_document_id uuid,
    placement_confirmed_at timestamp with time zone,
    placement_confirmed_by uuid,
    placement_photo_document_id uuid
);


--
-- Name: qr_scan_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_scan_logs (
    id uuid NOT NULL,
    qr_code_id uuid NOT NULL,
    scanned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address character varying(45),
    user_agent text
);


--
-- Name: sys_application_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_application_sequences (
    id uuid NOT NULL,
    year integer NOT NULL,
    type_code character varying(10) NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: sys_certificate_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_certificate_sequences (
    id uuid NOT NULL,
    year integer NOT NULL,
    type_code character varying(10) NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: sys_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_config (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    updated_by uuid,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sys_job_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_job_runs (
    id uuid NOT NULL,
    job_type character varying(50) NOT NULL,
    status public.job_run_status NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    metadata jsonb,
    error_log jsonb
);


--
-- Name: sys_legacy_registry_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_legacy_registry_sequences (
    id uuid NOT NULL,
    municipality_id uuid NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: sys_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_notification_preferences (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    channel public.notif_channel NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sys_notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_notification_templates (
    id uuid NOT NULL,
    code character varying(100) NOT NULL,
    channel public.notif_channel NOT NULL,
    subject character varying(255),
    body text NOT NULL,
    variables jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sys_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    channel public.notif_channel NOT NULL,
    status public.notif_status DEFAULT 'PENDING'::public.notif_status NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    read_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_registry_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_registry_sequences (
    id uuid NOT NULL,
    municipality_id uuid NOT NULL,
    year integer NOT NULL,
    last_sequence integer DEFAULT 0 NOT NULL
);


--
-- Name: sys_reminder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_reminder_rules (
    id uuid NOT NULL,
    entity_type public.reminder_entity_type NOT NULL,
    days_before integer NOT NULL,
    channel public.notif_channel NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: sys_scheduled_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sys_scheduled_reminders (
    id uuid NOT NULL,
    entity_type public.reminder_entity_type NOT NULL,
    entity_id uuid NOT NULL,
    elevator_id uuid,
    user_id uuid NOT NULL,
    channel public.notif_channel NOT NULL,
    days_before integer NOT NULL,
    target_date date NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: app_application_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_application_data (id, application_id, building_address, municipality_id, administrative_unit_id, building_name, gps_latitude, gps_longitude, elevator_type, manufacturer, model, serial_number, manufacturing_year, capacity_kg, capacity_persons, speed_ms, floors_served, stops, drive_type, additional_technical, correction_fields, update_fields, deregistration_reason, modernization_notes, updated_at, certifier_notes, installation_certificate_date, installation_certificate_number, certificate_reference, certifier_technical_notes, conformity_result, examination_date, examination_type, omi_number, building_type, deregistration_reason_type, entrance, floor_location, modernization_type, notes, responsible_entity_email, responsible_entity_identifier, responsible_entity_name, responsible_entity_phone, update_type, usage_purpose, application_date, legacy_district_code, registration_extended_data, specific_position) FROM stdin;
abf89d1c-2de1-459b-8785-48af77290e11	c4d4d060-edfc-481e-bcd8-0de44f495745	Rr. Myslym Shyri, Pallati 5, Tiranë 1001	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Pallati Dritan	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.372+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	CO_OWNERSHIP_BUILDING	\N	Hyrja 2	\N	\N	\N	bashkepersoni përgjegjës i ashensoritet.dritan@example.al	\N	Shoqata e Bashkëpronarëve Dritan	+355 69 200 0001	\N	ELECTRIC_PASSENGER	2026-06-29	TR	{"usagePurposeCode": "TRANSPORT_NJEREZISH_ELEKTRIK", "applicationSubtype": "FIRST", "elevatorConditionType": "EXISTING", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "NDERTESA_NE_BASHKEPRONESI", "responsibleIdentifierType": "NIPT"}	\N
c79bd1a4-fd2a-4744-8d5b-2111941efff6	c414a260-825d-4a03-a654-800397f4bab0	Autostrada Tiranë-Durrës, Km 4	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Qendra Tregtare City Park	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.383+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	SHOPPING_CENTER	\N	Blloku A	\N	\N	\N	facility@citypark.al	\N	City Park Management Sh.p.k.	+355 69 200 0002	\N	PASSENGER_AND_FREIGHT	2026-06-29	TR	{"usagePurposeCode": "TRANSPORT_NJEREZISH_DHE_MALLRASH", "applicationSubtype": "FIRST", "elevatorConditionType": "EXISTING", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "VEND_PUNE_QENDER_TREGTARE", "responsibleIdentifierType": "NIPT"}	\N
4e480cef-ac07-4984-8bba-ff9ba8b5c73f	381c3044-bfdf-4f1b-aa10-cc4b1ac47548	Rr. e Dibrës 370, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Spitali Rajonal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.388+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	PUBLIC_BUILDING	\N	Hyrja kryesore	\N	\N	\N	sherbimet@spitalirajonal.al	\N	Drejtoria e Spitalit Rajonal	+355 69 200 0003	\N	PASSENGER_AND_BED	2026-06-29	TR	{"usagePurposeCode": "TRANSPORT_NJEREZISH_DHE_SHTRATI", "applicationSubtype": "FIRST", "elevatorConditionType": "EXISTING", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "NDERTESE_PUBLIKE", "responsibleIdentifierType": "NIPT"}	\N
47ad2ce9-5c13-4670-b47f-abc3415ea9fe	2ce7ff2a-3714-4ccc-b18f-027f50b0c90a	Bulevardi Bajram Curri, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Kulla e Biznesit Alpha	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.393+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	WORKPLACE	\N	Hyrja Veriore	\N	\N	\N	admin@alphacenter.al	\N	Alpha Business Center Sh.p.k.	+355 69 200 0004	\N	ELECTRIC_PASSENGER	2026-06-29	TR	{"usagePurposeCode": "TRANSPORT_NJEREZISH_ELEKTRIK", "applicationSubtype": "FIRST", "elevatorConditionType": "EXISTING", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "VEND_PUNE_QENDER_TREGTARE", "responsibleIdentifierType": "NIPT"}	\N
c66e4dc8-fc18-427a-b761-70c16912c726	8fc6d58c-3888-4ae2-8504-c35ab0ddfff3	Kodra e Diellit, Selitë, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Rezidenca Kodra e Diellit	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.397+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	RESIDENTIAL	\N	Vila 12	\N	\N	\N	personi përgjegjës i ashensorit@example.al	\N	Personi Përgjegjës Shembull	+355 69 200 0005	\N	HYDRAULIC_PASSENGER	2026-06-29	TR	{"usagePurposeCode": "TRANSPORT_NJEREZISH_HIDRAULIK", "applicationSubtype": "FIRST", "elevatorConditionType": "EXISTING", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "MJEDISE_SHTEPIAKE", "responsibleIdentifierType": "NIPT"}	\N
bdeea97d-0e17-4c0a-b056-d52df8174585	46958dd5-0fc2-493a-be3d-07ba3ef66061	Rr. Sami Frashëri 15, Tiranë 1019	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Rezidenca Panorama	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.402+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	RESIDENTIAL	\N	Hyrja 1	\N	\N	\N	panorama@example.al	\N	Shoqata e Bashkëpronarëve Panorama	+355 69 200 0101	\N	ELECTRIC_PASSENGER	2026-06-29	\N	{"usagePurposeCode": "ELECTRIC_PASSENGER", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "RESIDENTIAL"}	\N
a4b64d72-68b9-4342-a50e-b99b7e14e8b6	077afbcf-11f7-4b92-b316-10d222a47b7f	Bulevardi Dëshmorët e Kombit 4, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Kulla Office One	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.423+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	WORKPLACE	\N	Hyrja Qendrore	\N	\N	\N	facility@officeone.al	\N	Office One Management Sh.p.k.	+355 69 200 0102	\N	PASSENGER_AND_FREIGHT	2026-06-29	\N	{"usagePurposeCode": "PASSENGER_AND_FREIGHT", "responsibleEntityType": "ADMINISTRATOR", "registrationBuildingType": "WORKPLACE"}	\N
\.


--
-- Data for Name: app_applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_applications (id, application_number, type, status, owner_org_id, installer_org_id, certifier_org_id, elevator_id, assigned_inspector_id, submitted_at, reviewed_at, approved_at, rejected_at, rejection_reason, return_reason, expires_at, created_at, updated_at, deleted_at, created_by, required_correction, return_to_role, asset_generation_completed_at, asset_generation_error, asset_generation_status, returned_at, returned_by, return_to_roles) FROM stdin;
c4d4d060-edfc-481e-bcd8-0de44f495745	APP-2026-REG-000001	NEW_REGISTRATION	BASIC_DATA_COMPLETED	a102599a-06e5-4928-843b-e0110dc8b64a	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.368+00	2026-06-29 16:50:18.368+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
c414a260-825d-4a03-a654-800397f4bab0	APP-2026-REG-000002	NEW_REGISTRATION	BASIC_DATA_COMPLETED	a102599a-06e5-4928-843b-e0110dc8b64a	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.381+00	2026-06-29 16:50:18.381+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
381c3044-bfdf-4f1b-aa10-cc4b1ac47548	APP-2026-REG-000003	NEW_REGISTRATION	BASIC_DATA_COMPLETED	a102599a-06e5-4928-843b-e0110dc8b64a	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.387+00	2026-06-29 16:50:18.387+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
2ce7ff2a-3714-4ccc-b18f-027f50b0c90a	APP-2026-REG-000004	NEW_REGISTRATION	BASIC_DATA_COMPLETED	a102599a-06e5-4928-843b-e0110dc8b64a	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.392+00	2026-06-29 16:50:18.392+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
8fc6d58c-3888-4ae2-8504-c35ab0ddfff3	APP-2026-REG-000005	NEW_REGISTRATION	BASIC_DATA_COMPLETED	a102599a-06e5-4928-843b-e0110dc8b64a	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.396+00	2026-06-29 16:50:18.396+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
46958dd5-0fc2-493a-be3d-07ba3ef66061	APP-2026-REG-000006	NEW_REGISTRATION	CLOSED	a102599a-06e5-4928-843b-e0110dc8b64a	09cb9b77-fbc2-4941-b500-36e14311474a	27e8b481-fd73-4aa9-a0dc-24feddae67ea	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.4+00	2026-06-29 16:50:18.4+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
077afbcf-11f7-4b92-b316-10d222a47b7f	APP-2026-REG-000007	NEW_REGISTRATION	CLOSED	a102599a-06e5-4928-843b-e0110dc8b64a	09cb9b77-fbc2-4941-b500-36e14311474a	27e8b481-fd73-4aa9-a0dc-24feddae67ea	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-06-29 16:50:18.422+00	2026-06-29 16:50:18.422+00	\N	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	\N	\N	PENDING	\N	\N	\N
\.


--
-- Data for Name: app_delegations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_delegations (id, application_id, organization_id, access_type, status, invited_by, invited_at, accepted_at, expires_at) FROM stdin;
\.


--
-- Data for Name: app_workflow_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_workflow_history (id, application_id, from_status, to_status, action, actor_id, comment, metadata, created_at) FROM stdin;
7f17233e-3715-424e-b7f7-bf3496599e75	c4d4d060-edfc-481e-bcd8-0de44f495745	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.376+00
68a72414-f5d3-438e-b9e1-82a9263bf041	c4d4d060-edfc-481e-bcd8-0de44f495745	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.376+00
ee57153f-6bd9-4793-bd61-3030c48e809b	c414a260-825d-4a03-a654-800397f4bab0	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.385+00
94167b26-e56a-4fdf-bd67-3af050291b86	c414a260-825d-4a03-a654-800397f4bab0	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.385+00
0119ab34-f900-44e8-af17-25a67de33d0c	381c3044-bfdf-4f1b-aa10-cc4b1ac47548	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.39+00
3cb72d17-4b03-4321-a312-1356962f3b37	381c3044-bfdf-4f1b-aa10-cc4b1ac47548	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.39+00
4d538a23-5fd5-401f-884d-63232e5d6652	2ce7ff2a-3714-4ccc-b18f-027f50b0c90a	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.394+00
e076a3fc-951c-4e86-a787-fac8794e2da4	2ce7ff2a-3714-4ccc-b18f-027f50b0c90a	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.394+00
27740618-79e3-4d14-97db-408b5340d7da	8fc6d58c-3888-4ae2-8504-c35ab0ddfff3	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.398+00
dfb46675-c5a0-4056-8577-425cfc3ad1b0	8fc6d58c-3888-4ae2-8504-c35ab0ddfff3	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.398+00
618357c8-f395-45b1-8994-707f5d34cede	46958dd5-0fc2-493a-be3d-07ba3ef66061	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.42+00
8cabd804-ce4a-4d91-a466-e7ea39a05edb	46958dd5-0fc2-493a-be3d-07ba3ef66061	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.42+00
6db9a93f-af9b-4540-a05a-38b7aa600236	46958dd5-0fc2-493a-be3d-07ba3ef66061	CERTIFICATION_COMPLETED	APPROVED	APPROVE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.42+00
adbe4f4f-6cdc-4192-8cf4-8caefbe2e624	46958dd5-0fc2-493a-be3d-07ba3ef66061	APPROVED	CLOSED	CLOSE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.42+00
03057493-f9f1-4d35-a78f-d85769ac0b62	077afbcf-11f7-4b92-b316-10d222a47b7f	\N	DRAFT	CREATE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.428+00
6f680a0a-efa9-4b19-ad0a-027ac172889a	077afbcf-11f7-4b92-b316-10d222a47b7f	DRAFT	BASIC_DATA_COMPLETED	SAVE_BASIC_DATA	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.428+00
567f7af0-b1e7-46cc-9aac-3057aa4d7668	077afbcf-11f7-4b92-b316-10d222a47b7f	CERTIFICATION_COMPLETED	APPROVED	APPROVE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.428+00
ec3336d7-8ec3-4f3b-8981-e868f8cb2284	077afbcf-11f7-4b92-b316-10d222a47b7f	APPROVED	CLOSED	CLOSE	b422b73a-6c91-4228-810c-bc03e3630c4d	\N	\N	2026-06-29 16:50:18.428+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, actor_id, action, entity_type, entity_id, before_state, after_state, metadata, ip_address, user_agent, correlation_id, created_at) FROM stdin;
da16a476-caf7-4714-9243-262cecca5ddb	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGIN	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	{}	{}	{}	\N	\N	\N	2026-06-29 16:54:44.338+00
02cdd342-e671-4782-ae9c-b34924047969	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGOUT	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	{}	{}	{}	\N	\N	\N	2026-06-29 16:57:35.796+00
1ad6fc15-0816-4010-bab6-3a8ac9d644ea	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGIN	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	{}	{}	{}	\N	\N	\N	2026-06-29 17:01:39.375+00
7ec2aa5f-a904-4edb-844f-4fd2e5f46db3	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGIN	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	{}	{}	{}	\N	\N	\N	2026-06-29 17:16:06.06+00
2b213540-4fd4-480e-be50-68481f29b3e1	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGOUT	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	{}	{}	{}	\N	\N	\N	2026-06-29 17:16:09.828+00
49cb171b-88a7-461c-a1cd-16b9c34529d9	4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	LOGIN	auth_user	4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	{}	{}	{}	\N	\N	\N	2026-06-29 17:16:16.862+00
2649ad9b-ef1a-4ca9-9f78-3e5333c7853e	4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	LOGOUT	auth_user	4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	null	null	null	\N	\N	\N	2026-06-29 17:17:23.141+00
487e1f96-8069-4dac-bc64-d43a2850d1d7	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGIN	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	null	null	null	\N	\N	\N	2026-06-29 17:17:42.42+00
be185e7f-1ab1-416b-8fbc-948a5befe6e3	b422b73a-6c91-4228-810c-bc03e3630c4d	LOGOUT	auth_user	b422b73a-6c91-4228-810c-bc03e3630c4d	null	null	null	\N	\N	\N	2026-06-29 17:17:46.686+00
2df6883a-8b62-440a-a53f-2d37a7d4ee96	78094869-c446-4768-8867-4dfcba5597f4	LOGIN	auth_user	78094869-c446-4768-8867-4dfcba5597f4	null	null	null	\N	\N	\N	2026-06-29 17:17:52.386+00
\.


--
-- Data for Name: auth_accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_accounts (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: auth_password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: auth_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permissions (id, code, module, action, description) FROM stdin;
cb131919-ecfa-42c5-8520-1e2b5cfd4d8f	auth.profile.view	auth	profile.view	auth.profile.view
fec9adad-7ee2-42cf-9986-4fae061c0592	auth.profile.edit	auth	profile.edit	auth.profile.edit
82595428-5f15-41d8-86c6-72830efdf79a	users.members.view	users	members.view	users.members.view
df74c0b1-c5ee-43d3-a610-2bb0107b4e14	users.members.manage	users	members.manage	users.members.manage
763dc4e9-b3d9-481b-b230-c8ad7127d8db	users.manage_all	users	manage_all	users.manage_all
df799532-2d8d-4295-b069-5b0213a6d8ca	organizations.org.view_own	organizations	org.view_own	organizations.org.view_own
e035d801-ad36-4887-94cd-5f30c279b441	organizations.org.edit_own	organizations	org.edit_own	organizations.org.edit_own
008a98ca-5782-468d-89e2-b98a24f241bb	organizations.org.view_companies	organizations	org.view_companies	organizations.org.view_companies
365b9ff9-4166-489b-b37f-bee3cb3992b2	organizations.org.manage_installer	organizations	org.manage_installer	organizations.org.manage_installer
f87eacb1-9d8e-4f61-89ec-720e6180195a	organizations.org.manage_certifier	organizations	org.manage_certifier	organizations.org.manage_certifier
e30d3ee4-423d-4f47-8df3-a9d0475ca4c8	licenses.view	licenses	view	licenses.view
d0093f85-14dd-418f-8d89-04f211202d34	licenses.manage	licenses	manage	licenses.manage
8f1b6629-262d-44e8-a6b2-9945e42cbe07	qkb.submit	qkb	submit	qkb.submit
bc7c524c-655a-4ca8-8891-cace1cdd7bc3	qkb.validate_manual	qkb	validate_manual	qkb.validate_manual
edee1a18-8bd8-4e2f-96c4-89eeba718864	dashboard.view	dashboard	view	dashboard.view
2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b	audit.view_entity	audit	view_entity	audit.view_entity
1f121b85-f8a6-42bc-b225-498c90b4932c	audit.view_system	audit	view_system	audit.view_system
c7ee8901-4e2f-4e83-bd64-0a0eed793efe	applications.create	applications	create	applications.create
158b094b-d1f8-47d3-a50f-5b6723aea99f	applications.view_own	applications	view_own	applications.view_own
a1f51a29-1a4a-4e48-8e54-8db6b7366526	applications.view_all	applications	view_all	applications.view_all
64c5a23e-2404-4ce8-b7d8-b25578bbde24	applications.submit	applications	submit	applications.submit
1827ef3a-9df2-47db-b5c6-45b3b3a19452	applications.assign_installer	applications	assign_installer	applications.assign_installer
06c6d6ba-fa5b-41a2-a139-47ed070ed4e2	applications.fill_technical	applications	fill_technical	applications.fill_technical
4e117309-7fcc-4ea4-88d7-05cdd0c0e68c	applications.assign_certifier	applications	assign_certifier	applications.assign_certifier
80e926bc-b6ac-4d13-89a8-1794271bd2cf	applications.upload_certification	applications	upload_certification	applications.upload_certification
4d5ee736-86bb-4e62-9431-448ff3bc7e6b	applications.review	applications	review	applications.review
d9dbcce6-aa69-4d4a-af47-f237002b2f0c	applications.approve	applications	approve	applications.approve
988b53f2-b421-402f-b548-d05aee88885d	documents.view	documents	view	documents.view
69c42a2f-6731-42a7-9624-1b60a9919d5b	documents.upload	documents	upload	documents.upload
da861fa3-a825-4871-adc5-a384e6d94177	documents.download	documents	download	documents.download
96424c13-6f88-4ace-9be7-1d77ac2578ab	elevators.view_own	elevators	view_own	elevators.view_own
1e151468-50b9-4de6-bf51-b86f01a0708c	applications.edit_draft	applications	edit_draft	applications.edit_draft
a31c8ee0-bd5c-4f93-b358-419bb94a5248	applications.cancel_draft	applications	cancel_draft	applications.cancel_draft
62060cf0-bc7c-44ed-b50d-16cc80b9dff3	documents.view_own	documents	view_own	documents.view_own
a1947f01-18c1-47f9-830b-896a7824aa01	documents.upload_own	documents	upload_own	documents.upload_own
aeb9c5ae-d895-4bb2-b542-dfabde0985ed	documents.download_own	documents	download_own	documents.download_own
a65c351b-f94d-4503-91fa-2a164a76f5a6	elevators.view_digital_file	elevators	view_digital_file	elevators.view_digital_file
694414f8-7c17-4830-86eb-320bd3954735	certificates.view_own	certificates	view_own	certificates.view_own
6ed30c9e-c831-4029-ada4-3be99f1dc4f4	certificates.download_own	certificates	download_own	certificates.download_own
8c8e2f3b-8c5c-4067-8777-0eb39f1ff5c6	qr.view_own	qr	view_own	qr.view_own
51cc9e49-f4aa-4061-aaf1-3d6f57140dfb	qr.download_own	qr	download_own	qr.download_own
ed4f5066-da5f-4bac-893f-d9a1f06d7e97	qr.upload_placement_photo	qr	upload_placement_photo	qr.upload_placement_photo
8f507125-7b33-4b50-8257-000d84fd3606	maintenance.request_assignment	maintenance	request_assignment	maintenance.request_assignment
2fd6ff35-f8aa-481d-be8a-550a6a040308	notifications.view_own	notifications	view_own	notifications.view_own
4c5a9639-f78f-4884-acda-70ee8386f843	migration.upload	migration	upload	migration.upload
85682375-4c68-493b-b7bf-5ee93400206e	migration.review	migration	review	migration.review
1218a43a-0be4-4212-a4c2-3737f8500856	migration.import	migration	import	migration.import
78957e5a-8618-4c89-8c7b-624fe6c9e5da	migration.rollback	migration	rollback	migration.rollback
a099b33c-bc50-49ca-a849-5f5a4f25c226	migration.confirm	migration	confirm	migration.confirm
975d755e-e9c8-4de0-b0c2-edf1d76f7b43	public.qr_view	public	qr_view	public.qr_view
041931b5-2c31-4fdc-b308-f9124c07faff	public.report_create	public	report_create	public.report_create
7277c688-24c1-45ed-a7a1-be072124a49d	reports.view	reports	view	reports.view
69fa86ad-d438-4270-878f-85effce608d1	reports.manage	reports	manage	reports.manage
17e3dd67-4160-4ea9-93ae-58d0e66e2cfc	maintenance.view_assigned	maintenance	view_assigned	maintenance.view_assigned
04430d55-b7f3-40cf-8848-87aa654c593a	maintenance.accept_contract	maintenance	accept_contract	maintenance.accept_contract
0a7e672c-4c5f-49ab-a931-074fd0347ef1	maintenance.log_intervention	maintenance	log_intervention	maintenance.log_intervention
aa72b8d6-da3f-4a33-9bca-39d4a80389bf	maintenance.upload_report	maintenance	upload_report	maintenance.upload_report
bd746ddd-8139-41d7-9cf5-04be390fc4b9	certifier.view_inspection_assignments	certifier	view_inspection_assignments	certifier.view_inspection_assignments
8d45f802-3ad1-46fe-b5a4-3af74238963c	certifier.accept_inspection_contract	certifier	accept_inspection_contract	certifier.accept_inspection_contract
e39dc054-a786-4286-be19-c50a35886c1d	certifier.log_periodic_inspection	certifier	log_periodic_inspection	certifier.log_periodic_inspection
f4f71378-2e75-49a1-bcc6-f1490326493f	inspections.field.assign	inspections	field.assign	inspections.field.assign
89fcd827-5a99-4ddb-9c5d-86ed14c67d65	inspections.field.view_all	inspections	field.view_all	inspections.field.view_all
44c439d5-f5ae-4dd1-814d-4a8075bfd3bc	inspections.field.view_own	inspections	field.view_own	inspections.field.view_own
7c1d0a88-b87f-490c-9f34-ccd8896ec2a9	inspections.field.conduct	inspections	field.conduct	inspections.field.conduct
0b4123ce-1c7c-4ad1-954b-48026e774926	inspections.field.cancel	inspections	field.cancel	inspections.field.cancel
7838000d-c776-4e45-ad94-2f4be3bcffb7	reports.export	reports	export	reports.export
\.


--
-- Data for Name: auth_role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_role_permissions (role_id, permission_id) FROM stdin;
ad355007-a62c-4edf-8471-5a457e230d35	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
ad355007-a62c-4edf-8471-5a457e230d35	fec9adad-7ee2-42cf-9986-4fae061c0592
ad355007-a62c-4edf-8471-5a457e230d35	82595428-5f15-41d8-86c6-72830efdf79a
ad355007-a62c-4edf-8471-5a457e230d35	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
ad355007-a62c-4edf-8471-5a457e230d35	df799532-2d8d-4295-b069-5b0213a6d8ca
ad355007-a62c-4edf-8471-5a457e230d35	e035d801-ad36-4887-94cd-5f30c279b441
ad355007-a62c-4edf-8471-5a457e230d35	008a98ca-5782-468d-89e2-b98a24f241bb
ad355007-a62c-4edf-8471-5a457e230d35	edee1a18-8bd8-4e2f-96c4-89eeba718864
60367fc2-ad42-45ac-b7e0-be22ba66a47c	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
60367fc2-ad42-45ac-b7e0-be22ba66a47c	fec9adad-7ee2-42cf-9986-4fae061c0592
60367fc2-ad42-45ac-b7e0-be22ba66a47c	82595428-5f15-41d8-86c6-72830efdf79a
60367fc2-ad42-45ac-b7e0-be22ba66a47c	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
60367fc2-ad42-45ac-b7e0-be22ba66a47c	df799532-2d8d-4295-b069-5b0213a6d8ca
60367fc2-ad42-45ac-b7e0-be22ba66a47c	008a98ca-5782-468d-89e2-b98a24f241bb
60367fc2-ad42-45ac-b7e0-be22ba66a47c	edee1a18-8bd8-4e2f-96c4-89eeba718864
afcc03f2-4c46-4ee6-9766-edc2637decb9	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
afcc03f2-4c46-4ee6-9766-edc2637decb9	fec9adad-7ee2-42cf-9986-4fae061c0592
afcc03f2-4c46-4ee6-9766-edc2637decb9	82595428-5f15-41d8-86c6-72830efdf79a
afcc03f2-4c46-4ee6-9766-edc2637decb9	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
afcc03f2-4c46-4ee6-9766-edc2637decb9	df799532-2d8d-4295-b069-5b0213a6d8ca
afcc03f2-4c46-4ee6-9766-edc2637decb9	008a98ca-5782-468d-89e2-b98a24f241bb
afcc03f2-4c46-4ee6-9766-edc2637decb9	edee1a18-8bd8-4e2f-96c4-89eeba718864
cf4e7312-eb91-4964-98ab-aec49f490de0	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
cf4e7312-eb91-4964-98ab-aec49f490de0	fec9adad-7ee2-42cf-9986-4fae061c0592
cf4e7312-eb91-4964-98ab-aec49f490de0	82595428-5f15-41d8-86c6-72830efdf79a
cf4e7312-eb91-4964-98ab-aec49f490de0	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
cf4e7312-eb91-4964-98ab-aec49f490de0	df799532-2d8d-4295-b069-5b0213a6d8ca
cf4e7312-eb91-4964-98ab-aec49f490de0	e035d801-ad36-4887-94cd-5f30c279b441
cf4e7312-eb91-4964-98ab-aec49f490de0	008a98ca-5782-468d-89e2-b98a24f241bb
cf4e7312-eb91-4964-98ab-aec49f490de0	8f1b6629-262d-44e8-a6b2-9945e42cbe07
cf4e7312-eb91-4964-98ab-aec49f490de0	edee1a18-8bd8-4e2f-96c4-89eeba718864
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	fec9adad-7ee2-42cf-9986-4fae061c0592
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	82595428-5f15-41d8-86c6-72830efdf79a
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	df799532-2d8d-4295-b069-5b0213a6d8ca
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	008a98ca-5782-468d-89e2-b98a24f241bb
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	edee1a18-8bd8-4e2f-96c4-89eeba718864
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
98ef1acf-6743-453a-aa9a-ea34087bfc4e	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
98ef1acf-6743-453a-aa9a-ea34087bfc4e	fec9adad-7ee2-42cf-9986-4fae061c0592
98ef1acf-6743-453a-aa9a-ea34087bfc4e	82595428-5f15-41d8-86c6-72830efdf79a
98ef1acf-6743-453a-aa9a-ea34087bfc4e	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
98ef1acf-6743-453a-aa9a-ea34087bfc4e	763dc4e9-b3d9-481b-b230-c8ad7127d8db
98ef1acf-6743-453a-aa9a-ea34087bfc4e	df799532-2d8d-4295-b069-5b0213a6d8ca
98ef1acf-6743-453a-aa9a-ea34087bfc4e	e035d801-ad36-4887-94cd-5f30c279b441
98ef1acf-6743-453a-aa9a-ea34087bfc4e	008a98ca-5782-468d-89e2-b98a24f241bb
98ef1acf-6743-453a-aa9a-ea34087bfc4e	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
98ef1acf-6743-453a-aa9a-ea34087bfc4e	bc7c524c-655a-4ca8-8891-cace1cdd7bc3
98ef1acf-6743-453a-aa9a-ea34087bfc4e	edee1a18-8bd8-4e2f-96c4-89eeba718864
98ef1acf-6743-453a-aa9a-ea34087bfc4e	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
98ef1acf-6743-453a-aa9a-ea34087bfc4e	1f121b85-f8a6-42bc-b225-498c90b4932c
f7ac2e62-c886-430d-8988-a7e7e17005ff	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
f7ac2e62-c886-430d-8988-a7e7e17005ff	fec9adad-7ee2-42cf-9986-4fae061c0592
f7ac2e62-c886-430d-8988-a7e7e17005ff	82595428-5f15-41d8-86c6-72830efdf79a
f7ac2e62-c886-430d-8988-a7e7e17005ff	df74c0b1-c5ee-43d3-a610-2bb0107b4e14
f7ac2e62-c886-430d-8988-a7e7e17005ff	df799532-2d8d-4295-b069-5b0213a6d8ca
f7ac2e62-c886-430d-8988-a7e7e17005ff	008a98ca-5782-468d-89e2-b98a24f241bb
f7ac2e62-c886-430d-8988-a7e7e17005ff	365b9ff9-4166-489b-b37f-bee3cb3992b2
f7ac2e62-c886-430d-8988-a7e7e17005ff	f87eacb1-9d8e-4f61-89ec-720e6180195a
f7ac2e62-c886-430d-8988-a7e7e17005ff	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
f7ac2e62-c886-430d-8988-a7e7e17005ff	d0093f85-14dd-418f-8d89-04f211202d34
f7ac2e62-c886-430d-8988-a7e7e17005ff	edee1a18-8bd8-4e2f-96c4-89eeba718864
f7ac2e62-c886-430d-8988-a7e7e17005ff	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
ad355007-a62c-4edf-8471-5a457e230d35	c7ee8901-4e2f-4e83-bd64-0a0eed793efe
ad355007-a62c-4edf-8471-5a457e230d35	158b094b-d1f8-47d3-a50f-5b6723aea99f
ad355007-a62c-4edf-8471-5a457e230d35	64c5a23e-2404-4ce8-b7d8-b25578bbde24
ad355007-a62c-4edf-8471-5a457e230d35	1827ef3a-9df2-47db-b5c6-45b3b3a19452
60367fc2-ad42-45ac-b7e0-be22ba66a47c	158b094b-d1f8-47d3-a50f-5b6723aea99f
60367fc2-ad42-45ac-b7e0-be22ba66a47c	06c6d6ba-fa5b-41a2-a139-47ed070ed4e2
60367fc2-ad42-45ac-b7e0-be22ba66a47c	4e117309-7fcc-4ea4-88d7-05cdd0c0e68c
afcc03f2-4c46-4ee6-9766-edc2637decb9	158b094b-d1f8-47d3-a50f-5b6723aea99f
afcc03f2-4c46-4ee6-9766-edc2637decb9	80e926bc-b6ac-4d13-89a8-1794271bd2cf
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	a1f51a29-1a4a-4e48-8e54-8db6b7366526
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	d9dbcce6-aa69-4d4a-af47-f237002b2f0c
98ef1acf-6743-453a-aa9a-ea34087bfc4e	a1f51a29-1a4a-4e48-8e54-8db6b7366526
ad355007-a62c-4edf-8471-5a457e230d35	988b53f2-b421-402f-b548-d05aee88885d
ad355007-a62c-4edf-8471-5a457e230d35	69c42a2f-6731-42a7-9624-1b60a9919d5b
60367fc2-ad42-45ac-b7e0-be22ba66a47c	988b53f2-b421-402f-b548-d05aee88885d
60367fc2-ad42-45ac-b7e0-be22ba66a47c	69c42a2f-6731-42a7-9624-1b60a9919d5b
afcc03f2-4c46-4ee6-9766-edc2637decb9	988b53f2-b421-402f-b548-d05aee88885d
afcc03f2-4c46-4ee6-9766-edc2637decb9	69c42a2f-6731-42a7-9624-1b60a9919d5b
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	988b53f2-b421-402f-b548-d05aee88885d
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	da861fa3-a825-4871-adc5-a384e6d94177
98ef1acf-6743-453a-aa9a-ea34087bfc4e	988b53f2-b421-402f-b548-d05aee88885d
98ef1acf-6743-453a-aa9a-ea34087bfc4e	da861fa3-a825-4871-adc5-a384e6d94177
ad355007-a62c-4edf-8471-5a457e230d35	da861fa3-a825-4871-adc5-a384e6d94177
ad355007-a62c-4edf-8471-5a457e230d35	96424c13-6f88-4ace-9be7-1d77ac2578ab
ad355007-a62c-4edf-8471-5a457e230d35	1e151468-50b9-4de6-bf51-b86f01a0708c
ad355007-a62c-4edf-8471-5a457e230d35	a31c8ee0-bd5c-4f93-b358-419bb94a5248
ad355007-a62c-4edf-8471-5a457e230d35	4e117309-7fcc-4ea4-88d7-05cdd0c0e68c
ad355007-a62c-4edf-8471-5a457e230d35	62060cf0-bc7c-44ed-b50d-16cc80b9dff3
ad355007-a62c-4edf-8471-5a457e230d35	a1947f01-18c1-47f9-830b-896a7824aa01
ad355007-a62c-4edf-8471-5a457e230d35	aeb9c5ae-d895-4bb2-b542-dfabde0985ed
ad355007-a62c-4edf-8471-5a457e230d35	a65c351b-f94d-4503-91fa-2a164a76f5a6
ad355007-a62c-4edf-8471-5a457e230d35	694414f8-7c17-4830-86eb-320bd3954735
ad355007-a62c-4edf-8471-5a457e230d35	6ed30c9e-c831-4029-ada4-3be99f1dc4f4
ad355007-a62c-4edf-8471-5a457e230d35	8c8e2f3b-8c5c-4067-8777-0eb39f1ff5c6
ad355007-a62c-4edf-8471-5a457e230d35	51cc9e49-f4aa-4061-aaf1-3d6f57140dfb
ad355007-a62c-4edf-8471-5a457e230d35	ed4f5066-da5f-4bac-893f-d9a1f06d7e97
ad355007-a62c-4edf-8471-5a457e230d35	8f507125-7b33-4b50-8257-000d84fd3606
ad355007-a62c-4edf-8471-5a457e230d35	2fd6ff35-f8aa-481d-be8a-550a6a040308
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	a099b33c-bc50-49ca-a849-5f5a4f25c226
98ef1acf-6743-453a-aa9a-ea34087bfc4e	4c5a9639-f78f-4884-acda-70ee8386f843
98ef1acf-6743-453a-aa9a-ea34087bfc4e	85682375-4c68-493b-b7bf-5ee93400206e
98ef1acf-6743-453a-aa9a-ea34087bfc4e	1218a43a-0be4-4212-a4c2-3737f8500856
98ef1acf-6743-453a-aa9a-ea34087bfc4e	78957e5a-8618-4c89-8c7b-624fe6c9e5da
e5987836-3d7a-43a2-96a7-2daa03f48039	975d755e-e9c8-4de0-b0c2-edf1d76f7b43
e5987836-3d7a-43a2-96a7-2daa03f48039	041931b5-2c31-4fdc-b308-f9124c07faff
60367fc2-ad42-45ac-b7e0-be22ba66a47c	2fd6ff35-f8aa-481d-be8a-550a6a040308
afcc03f2-4c46-4ee6-9766-edc2637decb9	bd746ddd-8139-41d7-9cf5-04be390fc4b9
afcc03f2-4c46-4ee6-9766-edc2637decb9	8d45f802-3ad1-46fe-b5a4-3af74238963c
afcc03f2-4c46-4ee6-9766-edc2637decb9	e39dc054-a786-4286-be19-c50a35886c1d
afcc03f2-4c46-4ee6-9766-edc2637decb9	2fd6ff35-f8aa-481d-be8a-550a6a040308
cf4e7312-eb91-4964-98ab-aec49f490de0	17e3dd67-4160-4ea9-93ae-58d0e66e2cfc
cf4e7312-eb91-4964-98ab-aec49f490de0	04430d55-b7f3-40cf-8848-87aa654c593a
cf4e7312-eb91-4964-98ab-aec49f490de0	0a7e672c-4c5f-49ab-a931-074fd0347ef1
cf4e7312-eb91-4964-98ab-aec49f490de0	aa72b8d6-da3f-4a33-9bca-39d4a80389bf
cf4e7312-eb91-4964-98ab-aec49f490de0	988b53f2-b421-402f-b548-d05aee88885d
cf4e7312-eb91-4964-98ab-aec49f490de0	62060cf0-bc7c-44ed-b50d-16cc80b9dff3
cf4e7312-eb91-4964-98ab-aec49f490de0	69c42a2f-6731-42a7-9624-1b60a9919d5b
cf4e7312-eb91-4964-98ab-aec49f490de0	a1947f01-18c1-47f9-830b-896a7824aa01
cf4e7312-eb91-4964-98ab-aec49f490de0	da861fa3-a825-4871-adc5-a384e6d94177
cf4e7312-eb91-4964-98ab-aec49f490de0	aeb9c5ae-d895-4bb2-b542-dfabde0985ed
cf4e7312-eb91-4964-98ab-aec49f490de0	2fd6ff35-f8aa-481d-be8a-550a6a040308
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	7277c688-24c1-45ed-a7a1-be072124a49d
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	69fa86ad-d438-4270-878f-85effce608d1
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	2fd6ff35-f8aa-481d-be8a-550a6a040308
03406615-cfb1-4538-8f3a-51eb248cebc5	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
03406615-cfb1-4538-8f3a-51eb248cebc5	fec9adad-7ee2-42cf-9986-4fae061c0592
03406615-cfb1-4538-8f3a-51eb248cebc5	82595428-5f15-41d8-86c6-72830efdf79a
03406615-cfb1-4538-8f3a-51eb248cebc5	df799532-2d8d-4295-b069-5b0213a6d8ca
03406615-cfb1-4538-8f3a-51eb248cebc5	008a98ca-5782-468d-89e2-b98a24f241bb
03406615-cfb1-4538-8f3a-51eb248cebc5	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
03406615-cfb1-4538-8f3a-51eb248cebc5	edee1a18-8bd8-4e2f-96c4-89eeba718864
03406615-cfb1-4538-8f3a-51eb248cebc5	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
03406615-cfb1-4538-8f3a-51eb248cebc5	a1f51a29-1a4a-4e48-8e54-8db6b7366526
03406615-cfb1-4538-8f3a-51eb248cebc5	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
03406615-cfb1-4538-8f3a-51eb248cebc5	d9dbcce6-aa69-4d4a-af47-f237002b2f0c
03406615-cfb1-4538-8f3a-51eb248cebc5	7277c688-24c1-45ed-a7a1-be072124a49d
03406615-cfb1-4538-8f3a-51eb248cebc5	69fa86ad-d438-4270-878f-85effce608d1
03406615-cfb1-4538-8f3a-51eb248cebc5	988b53f2-b421-402f-b548-d05aee88885d
03406615-cfb1-4538-8f3a-51eb248cebc5	da861fa3-a825-4871-adc5-a384e6d94177
03406615-cfb1-4538-8f3a-51eb248cebc5	2fd6ff35-f8aa-481d-be8a-550a6a040308
98ef1acf-6743-453a-aa9a-ea34087bfc4e	7277c688-24c1-45ed-a7a1-be072124a49d
98ef1acf-6743-453a-aa9a-ea34087bfc4e	69fa86ad-d438-4270-878f-85effce608d1
98ef1acf-6743-453a-aa9a-ea34087bfc4e	2fd6ff35-f8aa-481d-be8a-550a6a040308
f7ac2e62-c886-430d-8988-a7e7e17005ff	2fd6ff35-f8aa-481d-be8a-550a6a040308
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	a65c351b-f94d-4503-91fa-2a164a76f5a6
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	44c439d5-f5ae-4dd1-814d-4a8075bfd3bc
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	7c1d0a88-b87f-490c-9f34-ccd8896ec2a9
752197a2-d2c2-4a33-a275-c834a1b92ba1	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
752197a2-d2c2-4a33-a275-c834a1b92ba1	fec9adad-7ee2-42cf-9986-4fae061c0592
752197a2-d2c2-4a33-a275-c834a1b92ba1	82595428-5f15-41d8-86c6-72830efdf79a
752197a2-d2c2-4a33-a275-c834a1b92ba1	df799532-2d8d-4295-b069-5b0213a6d8ca
752197a2-d2c2-4a33-a275-c834a1b92ba1	008a98ca-5782-468d-89e2-b98a24f241bb
752197a2-d2c2-4a33-a275-c834a1b92ba1	edee1a18-8bd8-4e2f-96c4-89eeba718864
752197a2-d2c2-4a33-a275-c834a1b92ba1	a65c351b-f94d-4503-91fa-2a164a76f5a6
752197a2-d2c2-4a33-a275-c834a1b92ba1	44c439d5-f5ae-4dd1-814d-4a8075bfd3bc
752197a2-d2c2-4a33-a275-c834a1b92ba1	7c1d0a88-b87f-490c-9f34-ccd8896ec2a9
752197a2-d2c2-4a33-a275-c834a1b92ba1	988b53f2-b421-402f-b548-d05aee88885d
752197a2-d2c2-4a33-a275-c834a1b92ba1	69c42a2f-6731-42a7-9624-1b60a9919d5b
752197a2-d2c2-4a33-a275-c834a1b92ba1	da861fa3-a825-4871-adc5-a384e6d94177
752197a2-d2c2-4a33-a275-c834a1b92ba1	2fd6ff35-f8aa-481d-be8a-550a6a040308
189ac18f-597f-4267-a86f-a61ae41a65f9	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
189ac18f-597f-4267-a86f-a61ae41a65f9	fec9adad-7ee2-42cf-9986-4fae061c0592
189ac18f-597f-4267-a86f-a61ae41a65f9	82595428-5f15-41d8-86c6-72830efdf79a
189ac18f-597f-4267-a86f-a61ae41a65f9	df799532-2d8d-4295-b069-5b0213a6d8ca
189ac18f-597f-4267-a86f-a61ae41a65f9	008a98ca-5782-468d-89e2-b98a24f241bb
189ac18f-597f-4267-a86f-a61ae41a65f9	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
189ac18f-597f-4267-a86f-a61ae41a65f9	edee1a18-8bd8-4e2f-96c4-89eeba718864
189ac18f-597f-4267-a86f-a61ae41a65f9	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
189ac18f-597f-4267-a86f-a61ae41a65f9	a1f51a29-1a4a-4e48-8e54-8db6b7366526
189ac18f-597f-4267-a86f-a61ae41a65f9	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
189ac18f-597f-4267-a86f-a61ae41a65f9	7277c688-24c1-45ed-a7a1-be072124a49d
189ac18f-597f-4267-a86f-a61ae41a65f9	69fa86ad-d438-4270-878f-85effce608d1
189ac18f-597f-4267-a86f-a61ae41a65f9	89fcd827-5a99-4ddb-9c5d-86ed14c67d65
189ac18f-597f-4267-a86f-a61ae41a65f9	988b53f2-b421-402f-b548-d05aee88885d
189ac18f-597f-4267-a86f-a61ae41a65f9	da861fa3-a825-4871-adc5-a384e6d94177
189ac18f-597f-4267-a86f-a61ae41a65f9	a65c351b-f94d-4503-91fa-2a164a76f5a6
189ac18f-597f-4267-a86f-a61ae41a65f9	2fd6ff35-f8aa-481d-be8a-550a6a040308
856b2caf-7b17-4ca4-810b-6393cc600193	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
856b2caf-7b17-4ca4-810b-6393cc600193	fec9adad-7ee2-42cf-9986-4fae061c0592
856b2caf-7b17-4ca4-810b-6393cc600193	82595428-5f15-41d8-86c6-72830efdf79a
856b2caf-7b17-4ca4-810b-6393cc600193	df799532-2d8d-4295-b069-5b0213a6d8ca
856b2caf-7b17-4ca4-810b-6393cc600193	008a98ca-5782-468d-89e2-b98a24f241bb
856b2caf-7b17-4ca4-810b-6393cc600193	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
856b2caf-7b17-4ca4-810b-6393cc600193	edee1a18-8bd8-4e2f-96c4-89eeba718864
856b2caf-7b17-4ca4-810b-6393cc600193	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
856b2caf-7b17-4ca4-810b-6393cc600193	a1f51a29-1a4a-4e48-8e54-8db6b7366526
856b2caf-7b17-4ca4-810b-6393cc600193	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
856b2caf-7b17-4ca4-810b-6393cc600193	7277c688-24c1-45ed-a7a1-be072124a49d
856b2caf-7b17-4ca4-810b-6393cc600193	69fa86ad-d438-4270-878f-85effce608d1
856b2caf-7b17-4ca4-810b-6393cc600193	f4f71378-2e75-49a1-bcc6-f1490326493f
856b2caf-7b17-4ca4-810b-6393cc600193	89fcd827-5a99-4ddb-9c5d-86ed14c67d65
856b2caf-7b17-4ca4-810b-6393cc600193	0b4123ce-1c7c-4ad1-954b-48026e774926
856b2caf-7b17-4ca4-810b-6393cc600193	988b53f2-b421-402f-b548-d05aee88885d
856b2caf-7b17-4ca4-810b-6393cc600193	da861fa3-a825-4871-adc5-a384e6d94177
856b2caf-7b17-4ca4-810b-6393cc600193	a65c351b-f94d-4503-91fa-2a164a76f5a6
856b2caf-7b17-4ca4-810b-6393cc600193	2fd6ff35-f8aa-481d-be8a-550a6a040308
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	cb131919-ecfa-42c5-8520-1e2b5cfd4d8f
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	fec9adad-7ee2-42cf-9986-4fae061c0592
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	82595428-5f15-41d8-86c6-72830efdf79a
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	df799532-2d8d-4295-b069-5b0213a6d8ca
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	008a98ca-5782-468d-89e2-b98a24f241bb
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	e30d3ee4-423d-4f47-8df3-a9d0475ca4c8
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	edee1a18-8bd8-4e2f-96c4-89eeba718864
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	2a880b0c-f6fc-45a7-aca0-ed98ba4cfb2b
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	a1f51a29-1a4a-4e48-8e54-8db6b7366526
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	d9dbcce6-aa69-4d4a-af47-f237002b2f0c
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	7277c688-24c1-45ed-a7a1-be072124a49d
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	69fa86ad-d438-4270-878f-85effce608d1
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	f4f71378-2e75-49a1-bcc6-f1490326493f
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	89fcd827-5a99-4ddb-9c5d-86ed14c67d65
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	0b4123ce-1c7c-4ad1-954b-48026e774926
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	988b53f2-b421-402f-b548-d05aee88885d
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	da861fa3-a825-4871-adc5-a384e6d94177
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	a65c351b-f94d-4503-91fa-2a164a76f5a6
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	2fd6ff35-f8aa-481d-be8a-550a6a040308
03406615-cfb1-4538-8f3a-51eb248cebc5	f4f71378-2e75-49a1-bcc6-f1490326493f
03406615-cfb1-4538-8f3a-51eb248cebc5	89fcd827-5a99-4ddb-9c5d-86ed14c67d65
03406615-cfb1-4538-8f3a-51eb248cebc5	0b4123ce-1c7c-4ad1-954b-48026e774926
03406615-cfb1-4538-8f3a-51eb248cebc5	a65c351b-f94d-4503-91fa-2a164a76f5a6
98ef1acf-6743-453a-aa9a-ea34087bfc4e	a65c351b-f94d-4503-91fa-2a164a76f5a6
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	89fcd827-5a99-4ddb-9c5d-86ed14c67d65
98ef1acf-6743-453a-aa9a-ea34087bfc4e	4d5ee736-86bb-4e62-9431-448ff3bc7e6b
ad355007-a62c-4edf-8471-5a457e230d35	7838000d-c776-4e45-ad94-2f4be3bcffb7
60367fc2-ad42-45ac-b7e0-be22ba66a47c	7838000d-c776-4e45-ad94-2f4be3bcffb7
afcc03f2-4c46-4ee6-9766-edc2637decb9	0a7e672c-4c5f-49ab-a931-074fd0347ef1
afcc03f2-4c46-4ee6-9766-edc2637decb9	aa72b8d6-da3f-4a33-9bca-39d4a80389bf
afcc03f2-4c46-4ee6-9766-edc2637decb9	04430d55-b7f3-40cf-8848-87aa654c593a
afcc03f2-4c46-4ee6-9766-edc2637decb9	a65c351b-f94d-4503-91fa-2a164a76f5a6
afcc03f2-4c46-4ee6-9766-edc2637decb9	da861fa3-a825-4871-adc5-a384e6d94177
afcc03f2-4c46-4ee6-9766-edc2637decb9	7838000d-c776-4e45-ad94-2f4be3bcffb7
cf4e7312-eb91-4964-98ab-aec49f490de0	a65c351b-f94d-4503-91fa-2a164a76f5a6
cf4e7312-eb91-4964-98ab-aec49f490de0	7838000d-c776-4e45-ad94-2f4be3bcffb7
752197a2-d2c2-4a33-a275-c834a1b92ba1	7838000d-c776-4e45-ad94-2f4be3bcffb7
189ac18f-597f-4267-a86f-a61ae41a65f9	7838000d-c776-4e45-ad94-2f4be3bcffb7
856b2caf-7b17-4ca4-810b-6393cc600193	7838000d-c776-4e45-ad94-2f4be3bcffb7
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	7838000d-c776-4e45-ad94-2f4be3bcffb7
03406615-cfb1-4538-8f3a-51eb248cebc5	7838000d-c776-4e45-ad94-2f4be3bcffb7
98ef1acf-6743-453a-aa9a-ea34087bfc4e	7838000d-c776-4e45-ad94-2f4be3bcffb7
f7ac2e62-c886-430d-8988-a7e7e17005ff	7838000d-c776-4e45-ad94-2f4be3bcffb7
\.


--
-- Data for Name: auth_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_roles (id, code, name, description) FROM stdin;
e5987836-3d7a-43a2-96a7-2daa03f48039	PUBLIC	Qytetar Publik	Përdorues i paautentifikuar
ad355007-a62c-4edf-8471-5a457e230d35	OWNER	Pronar / Administrator	Pronar ose administrator ndërtese
60367fc2-ad42-45ac-b7e0-be22ba66a47c	INSTALLER	Kompani Instalimi	Kompani e licencuar e instalimit
afcc03f2-4c46-4ee6-9766-edc2637decb9	CERTIFIER	Kompani Certifikimi / OMI	Organizëm certifikimi
cf4e7312-eb91-4964-98ab-aec49f490de0	MAINTENANCE	Kompani Mirëmbajtjeje	Kompani mirëmbajtjeje
c0cf80d8-ace0-47ec-8bc5-97d13d212f3d	INSPECTOR	Inspektor ISHMT (legacy)	Rol i vjetër - specialist + terren
752197a2-d2c2-4a33-a275-c834a1b92ba1	FIELD_INSPECTOR	Inspektor terreni	Inspektim fizik në objekt
189ac18f-597f-4267-a86f-a61ae41a65f9	SECTOR_SPECIALIST	Specialist sektori	Monitorim i situatës, raportime qytetarësh dhe shqyrtim aplikimesh
856b2caf-7b17-4ca4-810b-6393cc600193	SECTOR_HEAD	Përgjegjës i Sektorit të Produkteve Mekanike	Menaxhim sektori dhe caktim inspektimi terreni
7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	ISHMT_DIRECTOR	Drektor Teknik	Miratim final dhe caktim inspektimi terreni
03406615-cfb1-4538-8f3a-51eb248cebc5	CHIEF_INSPECTOR	Kryeinspektor	Miratimi final i regjistrimit
98ef1acf-6743-453a-aa9a-ea34087bfc4e	ADMIN	Administrator ISHMT	Administrator sistemi
f7ac2e62-c886-430d-8988-a7e7e17005ff	DIRECTORATE	Drejtoria e Politikave	Drejtoria e Politikave të Tregut të Brendshëm
\.


--
-- Data for Name: auth_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_sessions (id, session_token, user_id, expires) FROM stdin;
\.


--
-- Data for Name: auth_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_users (id, email, password_hash, first_name, last_name, phone, nid, is_active, email_verified, last_login_at, failed_login_count, locked_until, created_at, updated_at, deleted_at, birth_date, father_name, id_card_number, mother_name, pending_email, two_factor_enabled, two_factor_secret) FROM stdin;
49ed9bc5-4f11-4d90-b449-9bdc3f478fba	admin@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Admin	ISHMT	\N	I90101001A	t	t	\N	0	\N	2026-06-29 16:50:18.33+00	2026-06-29 16:50:18.33+00	\N	\N	Petrit	AB1010101	Drita	\N	f	\N
57d5062f-81dc-41ba-a9be-9ecf951779d2	kryeinspektor@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Edison	Konomi	\N	I90505005E	t	t	\N	0	\N	2026-06-29 16:50:18.336+00	2026-06-29 16:50:18.336+00	\N	\N	Elton	AB5050505	Arta	\N	f	\N
9f66cd77-704f-4ed3-b86d-54b6ed617e85	specialist@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Specialist	Sektori	\N	I90808008H	t	t	\N	0	\N	2026-06-29 16:50:18.343+00	2026-06-29 16:50:18.343+00	\N	\N	Erjon	AB8080808	Anila	\N	f	\N
c0a1df90-2b21-4b81-9be9-86b0f3b77144	terren@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Inspektor	Terreni	\N	I90909009I	t	t	\N	0	\N	2026-06-29 16:50:18.345+00	2026-06-29 16:50:18.345+00	\N	\N	Flamur	AB9090909	Ornela	\N	f	\N
1057d064-3b66-4e9b-be03-5c8a42612aff	drejtoria@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Drejtori	MPB	\N	I90303003C	t	t	\N	0	\N	2026-06-29 16:50:18.347+00	2026-06-29 16:50:18.347+00	\N	\N	Bujar	AB3030303	Vera	\N	f	\N
e26021bc-fbb0-4171-81c6-277306bc418a	installer@ashensorepro.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Genti	Hoxha	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.351+00	2026-06-29 16:50:18.351+00	\N	\N	\N	\N	\N	\N	f	\N
f78965fe-4f64-425f-9668-b95fc2871962	installer@liftmaster.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Ardit	Leka	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.353+00	2026-06-29 16:50:18.353+00	\N	\N	\N	\N	\N	\N	f	\N
67d8ec7c-11f4-4a52-9eaf-277fa482e9f8	installer@euroashensore.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Sara	Doçi	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.355+00	2026-06-29 16:50:18.355+00	\N	\N	\N	\N	\N	\N	f	\N
dc957e3b-562c-45ac-9249-f96f3feab648	cert@omicert.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Eda	Krasniqi	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.356+00	2026-06-29 16:50:18.356+00	\N	\N	\N	\N	\N	\N	f	\N
ab1be32c-e287-45c0-9b1a-b0950cb2a8e8	cert@inspektomi.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Blerim	Vata	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.358+00	2026-06-29 16:50:18.358+00	\N	\N	\N	\N	\N	\N	f	\N
bddfa7c2-231f-4776-9a12-ada6ffdcc3a0	cert@qualitylift.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Nora	Shehu	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.359+00	2026-06-29 16:50:18.359+00	\N	\N	\N	\N	\N	\N	f	\N
051371ec-0062-4d33-aa1c-49dc94172067	mirembajtje@servisashensore.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Florian	Beqiri	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.361+00	2026-06-29 16:50:18.361+00	\N	\N	\N	\N	\N	\N	f	\N
6bba841c-4c01-4872-96af-d7109adab19e	mirembajtje@servislift24.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Klodian	Rama	\N	\N	t	t	\N	0	\N	2026-06-29 16:50:18.362+00	2026-06-29 16:50:18.362+00	\N	\N	\N	\N	\N	\N	f	\N
4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	shef@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Albert	Shqalshi	\N	I90707007G	t	t	2026-06-29 17:16:16.853+00	0	\N	2026-06-29 16:50:18.342+00	2026-06-29 17:16:16.854+00	\N	\N	Ilir	AB7070707	Besa	\N	f	\N
b422b73a-6c91-4228-810c-bc03e3630c4d	personi përgjegjës i ashensorit@example.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Personi	Shembull	\N	I90404004D	t	t	2026-06-29 17:17:42.41+00	0	\N	2026-06-29 16:50:18.349+00	2026-06-29 17:17:42.411+00	\N	\N	Sokol	AB4040404	Lindita	\N	f	\N
78094869-c446-4768-8867-4dfcba5597f4	drejtori@ishmt.gov.al	$2a$12$KStw/1XSBKcc46Gh6imcVuz9OrcMOnaDu1vEy5QnxCEjN3tkMr12y	Erion	Prifti	\N	I90606006F	t	t	2026-06-29 17:17:52.379+00	0	\N	2026-06-29 16:50:18.339+00	2026-06-29 17:17:52.38+00	\N	\N	Gent	AB6060606	Elona	\N	f	\N
\.


--
-- Data for Name: auth_verification_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_verification_tokens (identifier, token, expires) FROM stdin;
\.


--
-- Data for Name: cert_certificates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cert_certificates (id, certificate_number, elevator_id, type, status, issued_date, expiry_date, issued_by_org_id, issued_by_user_id, application_id, inspection_id, document_id, superseded_by_id, revoked_at, revoked_reason, created_at, updated_at) FROM stdin;
f242c111-60cf-40b3-b799-83120f4d5ecd	CR00001	b9f564e5-ba9c-4f30-8b20-326857b1194b	REGISTRATION	ACTIVE	2026-06-29	2028-06-29	27e8b481-fd73-4aa9-a0dc-24feddae67ea	\N	46958dd5-0fc2-493a-be3d-07ba3ef66061	\N	\N	\N	\N	\N	2026-06-29 16:50:18.412+00	2026-06-29 16:50:18.412+00
18c814cb-adb7-4ddc-a8d7-7ad1f435951c	CR00002	97f291d6-33f4-4c60-a03c-1a17c357bb11	REGISTRATION	ACTIVE	2026-06-29	2028-06-29	27e8b481-fd73-4aa9-a0dc-24feddae67ea	\N	077afbcf-11f7-4b92-b316-10d222a47b7f	\N	\N	\N	\N	\N	2026-06-29 16:50:18.426+00	2026-06-29 16:50:18.426+00
\.


--
-- Data for Name: cit_report_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cit_report_actions (id, report_id, action, actor_id, comment, created_at) FROM stdin;
\.


--
-- Data for Name: cit_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cit_reports (id, report_number, type, status, reporter_user_id, reporter_name, reporter_email, reporter_phone, elevator_id, location_address, municipality_id, gps_latitude, gps_longitude, description, priority, assigned_inspector_id, resolved_at, resolution_notes, created_at, updated_at) FROM stdin;
e57e357c-1893-47c7-9b59-e8b38e4b9ed0	RPT-2026-DEMO01	SAFETY_ISSUE	SUBMITTED	\N	Ana Gjini	ana.gjini@example.al	+355 69 111 2233	b9f564e5-ba9c-4f30-8b20-326857b1194b	Rruga e Durrësit, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	Demo: Ashensori u ngec midis katit 3 dhe 4. Dy persona brenda. Kërkohet ndihmë e menjëhershme.	HIGH	\N	\N	\N	2026-06-29 16:50:18.438+00	2026-06-29 16:50:18.438+00
4050f40f-c78f-4bcf-98cf-f112a8d61815	RPT-2026-DEMO02	NO_QR	SUBMITTED	\N	Besnik Hoxha	\N	+355 68 222 3344	97f291d6-33f4-4c60-a03c-1a17c357bb11	Blloku, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	Demo: Nuk ka QR kod të dukshëm brenda kabinës. Nuk mund të verifikoj certifikatën e ashensorit.	NORMAL	\N	\N	\N	2026-06-29 16:50:18.438+00	2026-06-29 16:50:18.438+00
fc92e232-44ab-4259-8ea5-917d33ea9b82	RPT-2026-DEMO03	COMPLAINT	TRIAGED	\N	Elona Krasniqi	elona.k@example.al	\N	b9f564e5-ba9c-4f30-8b20-326857b1194b	Kompleksi Panorama, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	Demo: Zhurmë e tepërt gjatë lëvizjes, sidomos në mëngjes. U mor në shqyrtim - pres caktim inspektori.	NORMAL	\N	\N	\N	2026-06-29 16:50:18.438+00	2026-06-29 16:50:18.438+00
ae4e881f-4ce8-4176-811a-d589d228124a	RPT-2026-DEMO04	SAFETY_ISSUE	ASSIGNED	\N	Gent Rama	\N	+355 67 333 4455	97f291d6-33f4-4c60-a03c-1a17c357bb11	Sheshi Wilson, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	Demo: Dera e kabinës mbyllet shumë shpejt - rrezik për personat me lëvizje të kufizuar. Caktuar inspektor terreni.	HIGH	c0a1df90-2b21-4b81-9be9-86b0f3b77144	\N	\N	2026-06-29 16:50:18.438+00	2026-06-29 16:50:18.438+00
ece1e068-5b59-45a9-bfbb-02f65558ca46	RPT-2026-DEMO05	COMPLAINT	INVESTIGATING	\N	Mira Shehu	mira.s@example.al	+355 69 444 5566	b9f564e5-ba9c-4f30-8b20-326857b1194b	Kompleksi Panorama, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	Demo: Ashensori ndalet shpesh midis kateve. Inspektori terreni po heton në objekt.	NORMAL	c0a1df90-2b21-4b81-9be9-86b0f3b77144	\N	\N	2026-06-29 16:50:18.438+00	2026-06-29 16:50:18.438+00
\.


--
-- Data for Name: doc_access_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doc_access_log (id, document_id, user_id, action, ip_address, created_at) FROM stdin;
\.


--
-- Data for Name: doc_document_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doc_document_links (id, document_id, entity_type, entity_id, created_at, purpose) FROM stdin;
\.


--
-- Data for Name: doc_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doc_documents (id, filename, original_filename, mime_type, file_size, storage_path, checksum_sha256, classification, uploaded_by, created_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: doc_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.doc_templates (id, name, type, version, description, content, storage_path, variables, is_active, created_by, created_at, updated_at) FROM stdin;
153181c0-f55e-4ff9-a7a7-903c3e32f3fb	Certifikatë Regjistrimi ISHMT	CERTIFICATE	1	Certifikatë Regjistrimi ISHMT	{{certificateNumber}}|{{registryNumber}}|{{ownerName}}|{{municipality}}|{{buildingAddress}}|{{issuedDate}}	\N	\N	t	49ed9bc5-4f11-4d90-b449-9bdc3f478fba	2026-06-29 16:50:18.363+00	2026-06-29 16:50:18.363+00
fcedd048-8eee-4cf1-9aea-a19c19a65313	Letër Zyrtare Përcjellëse	OFFICIAL_LETTER	1	Letër Zyrtare Përcjellëse	{{applicationNumber}}|{{registryNumber}}|{{ownerName}}|{{municipality}}|{{buildingAddress}}|{{issuedDate}}|{{certificateNumber}}	\N	\N	t	49ed9bc5-4f11-4d90-b449-9bdc3f478fba	2026-06-29 16:50:18.366+00	2026-06-29 16:50:18.366+00
\.


--
-- Data for Name: elv_compliance_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_compliance_status (id, elevator_id, indicator, inspection_valid, certificate_valid, maintenance_valid, inspection_expiring, certificate_expiring, maintenance_expiring, is_suspended, last_calculated_at) FROM stdin;
8fecc64d-8543-4a3f-b821-2644cef3cdc0	b9f564e5-ba9c-4f30-8b20-326857b1194b	GREEN	t	t	t	f	f	f	f	2026-06-29 16:50:18.495+00
079a1417-ba2b-4314-9eb3-080abf7745d7	97f291d6-33f4-4c60-a03c-1a17c357bb11	RED	f	t	f	f	f	f	f	2026-06-29 16:50:18.502+00
\.


--
-- Data for Name: elv_delegation_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_delegation_history (id, elevator_id, organization_id, delegation_type, assigned_by, assigned_at, accepted_at, revoked_at, status) FROM stdin;
\.


--
-- Data for Name: elv_elevators; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_elevators (id, registry_number, application_id, status, owner_org_id, installer_org_id, certifier_org_id, maintenance_org_id, building_address, municipality_id, administrative_unit_id, building_name, gps_latitude, gps_longitude, registration_date, activation_date, deregistration_date, deregistration_reason, confirmed_at, confirmed_by, created_at, updated_at, deleted_at, requires_attention, building_id) FROM stdin;
b9f564e5-ba9c-4f30-8b20-326857b1194b	000901 TR	46958dd5-0fc2-493a-be3d-07ba3ef66061	ACTIVE	a102599a-06e5-4928-843b-e0110dc8b64a	09cb9b77-fbc2-4941-b500-36e14311474a	27e8b481-fd73-4aa9-a0dc-24feddae67ea	f94b532e-fbba-4d59-bdde-223667b401ec	Rr. Sami Frashëri 15, Tiranë 1019	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Rezidenca Panorama	41.3231000	19.8187000	2026-06-29	2026-06-29	\N	\N	\N	\N	2026-06-29 16:50:18.404+00	2026-06-29 16:50:18.455+00	\N	f	\N
97f291d6-33f4-4c60-a03c-1a17c357bb11	000902 TR	077afbcf-11f7-4b92-b316-10d222a47b7f	ACTIVE	a102599a-06e5-4928-843b-e0110dc8b64a	09cb9b77-fbc2-4941-b500-36e14311474a	27e8b481-fd73-4aa9-a0dc-24feddae67ea	f94b532e-fbba-4d59-bdde-223667b401ec	Bulevardi Dëshmorët e Kombit 4, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	Kulla Office One	41.3265000	19.8201000	2026-06-29	2026-06-29	\N	\N	\N	\N	2026-06-29 16:50:18.424+00	2026-06-29 16:50:18.457+00	\N	t	\N
\.


--
-- Data for Name: elv_ownership_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_ownership_history (id, elevator_id, old_owner_id, new_owner_id, change_date, application_id, reason, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: elv_responsible_entities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_responsible_entities (id, elevator_id, organization_id, role, valid_from, valid_to, application_id, created_at) FROM stdin;
\.


--
-- Data for Name: elv_status_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_status_history (id, elevator_id, from_status, to_status, reason, suspension_reason, application_id, actor_id, created_at) FROM stdin;
6661082e-83e2-4a8b-8fc9-baa8f8541ecb	b9f564e5-ba9c-4f30-8b20-326857b1194b	\N	ACTIVE	Regjistrim fillestar i miratuar	\N	46958dd5-0fc2-493a-be3d-07ba3ef66061	b422b73a-6c91-4228-810c-bc03e3630c4d	2026-06-29 16:50:18.418+00
010b06f2-4c5d-4ddb-aff3-3680554bd334	97f291d6-33f4-4c60-a03c-1a17c357bb11	\N	ACTIVE	Regjistrim fillestar i miratuar	\N	077afbcf-11f7-4b92-b316-10d222a47b7f	b422b73a-6c91-4228-810c-bc03e3630c4d	2026-06-29 16:50:18.428+00
\.


--
-- Data for Name: elv_technical_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_technical_data (id, elevator_id, elevator_type, manufacturer, model, serial_number, manufacturing_year, capacity_kg, capacity_persons, speed_ms, floors_served, stops, drive_type, door_type, control_system, additional_data, current_version_id, updated_at) FROM stdin;
00ac980e-4c10-43b8-ae3f-4b2d2d75dd76	b9f564e5-ba9c-4f30-8b20-326857b1194b	PASSENGER	KONE	MonoSpace 500	KN-2025-884512	2025	630	8	\N	9	9	ELECTRIC	AUTOMATIC	\N	\N	\N	2026-06-29 16:50:18.41+00
d9116194-6a44-498e-8ac5-7702fe2e04f6	97f291d6-33f4-4c60-a03c-1a17c357bb11	PASSENGER	Schindler	Schindler 5500	SCH-2024-553120	2024	1000	13	\N	14	14	ELECTRIC	AUTOMATIC	\N	\N	\N	2026-06-29 16:50:18.425+00
\.


--
-- Data for Name: elv_technical_data_versions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.elv_technical_data_versions (id, elevator_id, application_id, version_number, is_current, elevator_type, manufacturer, model, serial_number, manufacturing_year, capacity_kg, capacity_persons, speed_ms, floors_served, stops, drive_type, door_type, control_system, additional_data, change_reason, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: geo_administrative_units; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_administrative_units (id, municipality_id, code, name_sq, name_en, unit_type, is_active, created_at, updated_at) FROM stdin;
a710f119-b6dd-4f0a-8601-00495251b332	759f955b-c3e9-4a9b-a649-2c624b6b4f57	PAT	Patos	Patos	urban	t	2026-06-26 08:50:47.074+00	2026-06-29 12:48:47.015+00
e84345b2-7dbe-4c16-9e00-f6cef096176b	6eafdbb5-3344-42b1-b804-98c2fc0347da	VLO	Vlorë	Vlore	urban	t	2026-06-26 08:50:47.075+00	2026-06-29 12:48:47.016+00
bb26893b-4aca-4023-832f-421e209a796c	eceb7db1-0c0b-492f-8c44-d41a1331101c	SAR	Sarandë	Sarande	urban	t	2026-06-26 08:50:47.075+00	2026-06-29 12:48:47.017+00
607f3bf5-b999-48dd-a47d-f405e7a675b6	586937f3-f1a6-4cb0-8895-102ac6cdf186	SHK	Shkodër	Shkoder	urban	t	2026-06-26 08:50:47.076+00	2026-06-29 12:48:47.018+00
9c61949e-3e6a-4713-a06a-fa1e4602f6d4	6bb8d6c2-9b2c-4846-8693-eff20b556a9b	KOR	Korçë	Korce	urban	t	2026-06-26 08:50:47.077+00	2026-06-29 12:48:47.018+00
3206dcd3-6b47-41dd-8fe0-cf35dccd89c2	f1c197b0-297e-4fdf-9646-0411cfc06697	POG	Pogradec	Pogradec	urban	t	2026-06-26 08:50:47.077+00	2026-06-29 12:48:47.019+00
34924377-0a89-47df-ad4b-59e3a34ab912	a4b7d142-f8a0-4028-8a6b-289fc26dfc45	GJI	Gjirokastër	Gjirokaster	urban	t	2026-06-26 08:50:47.078+00	2026-06-29 12:48:47.021+00
6cf5bda2-5b14-40f4-8bd8-8b7671af8a95	5a89c82e-8e9a-4f60-832b-444c6dc92a61	BER	Berat	Berat	urban	t	2026-06-26 08:50:47.078+00	2026-06-29 12:48:47.021+00
b770daf7-afcf-455c-a833-77ddc7feee6a	b7c814a2-91b1-4b57-88dc-3134c2d5d626	KUK	Kukës	Kukes	urban	t	2026-06-26 08:50:47.079+00	2026-06-29 12:48:47.022+00
292eae3f-0c4b-4e14-b923-2ce40b67aeb4	e1291bdd-6f9d-4cff-857d-b1ef325223a6	LEZ	Lezhë	Lezhe	urban	t	2026-06-26 08:50:47.08+00	2026-06-29 12:48:47.022+00
eabf7cbc-e7ae-400a-9ed2-4c3b4832edba	26f575f2-6eea-48e9-a576-a4cd59c450e9	DIB	Dibër	Diber	urban	t	2026-06-26 08:50:47.08+00	2026-06-29 12:48:47.023+00
5bfcd99a-0876-4954-bbbd-11383b5d377e	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB01	Njësia Bashkiake Nr. 1	Administrative Unit No. 1	urban	t	2026-06-26 08:50:47.057+00	2026-06-29 12:48:47+00
817e6298-51fc-4c06-93b8-b05dc322996b	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB02	Njësia Bashkiake Nr. 2	Administrative Unit No. 2	urban	t	2026-06-26 08:50:47.059+00	2026-06-29 12:48:47.001+00
13901d13-86ad-433b-9de5-8fa830a600cb	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB03	Njësia Bashkiake Nr. 3	Administrative Unit No. 3	urban	t	2026-06-26 08:50:47.06+00	2026-06-29 12:48:47.002+00
b0bb4f50-ebb0-45cb-abca-289f2b2146f7	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB04	Njësia Bashkiake Nr. 4	Administrative Unit No. 4	urban	t	2026-06-26 08:50:47.061+00	2026-06-29 12:48:47.003+00
c5d268ea-7499-456e-8114-a96b23dc8c74	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB05	Njësia Bashkiake Nr. 5	Administrative Unit No. 5	urban	t	2026-06-26 08:50:47.061+00	2026-06-29 12:48:47.003+00
908ef52e-9fcc-4be8-aced-8cc7ff2d944e	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB06	Njësia Bashkiake Nr. 6	Administrative Unit No. 6	urban	t	2026-06-26 08:50:47.062+00	2026-06-29 12:48:47.004+00
ed4959d6-4b67-470e-b744-ad5ba27ff176	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB07	Njësia Bashkiake Nr. 7	Administrative Unit No. 7	urban	t	2026-06-26 08:50:47.063+00	2026-06-29 12:48:47.005+00
a64e848c-e312-4786-800c-f78a6957615e	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB08	Njësia Bashkiake Nr. 8	Administrative Unit No. 8	urban	t	2026-06-26 08:50:47.063+00	2026-06-29 12:48:47.005+00
135101ed-5be8-4a0d-b339-ba5a04b160d3	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB09	Njësia Bashkiake Nr. 9	Administrative Unit No. 9	urban	t	2026-06-26 08:50:47.064+00	2026-06-29 12:48:47.006+00
6e045750-b3e1-4ace-861f-b81749676c76	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB10	Njësia Bashkiake Nr. 10	Administrative Unit No. 10	urban	t	2026-06-26 08:50:47.065+00	2026-06-29 12:48:47.007+00
7627677b-6966-4cac-be5f-2c360ab4b30f	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	NB11	Njësia Bashkiake Nr. 11	Administrative Unit No. 11	urban	t	2026-06-26 08:50:47.066+00	2026-06-29 12:48:47.008+00
470ea8dd-2cfe-435c-843d-b2b8792cc7a1	c1607990-547e-4583-bc60-11532287e8f4	KAM	Kamëz	Kamez	urban	t	2026-06-26 08:50:47.066+00	2026-06-29 12:48:47.008+00
e9f2c9b0-ea93-4ca7-94e6-b2e811e63bd2	c7596187-fd1a-4794-9f47-ba5a4bed7d21	VOR	Vorë	Vore	urban	t	2026-06-26 08:50:47.067+00	2026-06-29 12:48:47.009+00
8cfdcfb8-3565-42ca-8716-b6884943889d	362eda6f-4031-4365-bd52-f4da2682dd5d	KAV	Kavajë	Kavaje	urban	t	2026-06-26 08:50:47.068+00	2026-06-29 12:48:47.01+00
c21444b3-e8f7-4383-ab4d-aad8b9d8df13	bafa88aa-964d-4bc3-92fa-5ce41069a28e	DUR	Qendra	Center	urban	t	2026-06-26 08:50:47.069+00	2026-06-29 12:48:47.011+00
109b2ac6-ad45-4a43-b7bc-92a09ad07d98	bafa88aa-964d-4bc3-92fa-5ce41069a28e	DUR-R	Rajoni	Region	urban	t	2026-06-26 08:50:47.069+00	2026-06-29 12:48:47.011+00
e4f9578b-73f5-4f2a-b1e5-70bb3aa38bda	86b3083b-600f-444f-abba-6246ec1c7071	SHI	Shijak	Shijak	urban	t	2026-06-26 08:50:47.07+00	2026-06-29 12:48:47.012+00
4f9e976f-4949-43bf-af94-a512b07b8b11	3c112a37-525f-4e21-a854-e77529992aa1	SUK	Sukth	Sukth	urban	t	2026-06-26 08:50:47.071+00	2026-06-29 12:48:47.013+00
2a8e4bc2-12b9-4062-8677-2951ca87af23	7e14406b-17d8-40ec-89a7-de5dc13cbea6	ELB	Elbasan	Elbasan	urban	t	2026-06-26 08:50:47.071+00	2026-06-29 12:48:47.013+00
ed92b633-8219-47df-b9e9-3f550c51f4c8	5a0a0c73-a9ca-4556-9312-21966b357ef8	BEL	Belsh	Belsh	urban	t	2026-06-26 08:50:47.072+00	2026-06-29 12:48:47.014+00
c2b4df10-fa26-48cb-8952-9293ca4a54fb	83550ff6-f2b2-427d-9b46-94ceaf2607aa	FIE	Fier	Fier	urban	t	2026-06-26 08:50:47.073+00	2026-06-29 12:48:47.014+00
\.


--
-- Data for Name: geo_buildings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_buildings (id, building_code, name, address, municipality_id, administrative_unit_id, building_type, entrance, floors_count, gps_latitude, gps_longitude, primary_owner_org_id, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: geo_municipalities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_municipalities (id, region_id, code, name_sq, name_en, is_active, created_at, updated_at, legacy_registry_code) FROM stdin;
5a0a0c73-a9ca-4556-9312-21966b357ef8	5188902d-31e9-4cdf-9344-027ef02ee210	BEL	Belsh	Belsh	t	2026-06-08 14:04:01.36+00	2026-06-29 12:48:46.989+00	EL
83550ff6-f2b2-427d-9b46-94ceaf2607aa	1dd4d403-09e8-43f7-877d-ed5f4f8de072	FIE	Fier	Fier	t	2026-06-08 14:04:01.361+00	2026-06-29 12:48:46.989+00	FR
759f955b-c3e9-4a9b-a649-2c624b6b4f57	1dd4d403-09e8-43f7-877d-ed5f4f8de072	PAT	Patos	Patos	t	2026-06-08 14:04:01.361+00	2026-06-29 12:48:46.99+00	FR
6eafdbb5-3344-42b1-b804-98c2fc0347da	e03e7c83-c093-4188-9bae-e9f289d17cd8	VLO	Vlorë	Vlore	t	2026-06-08 14:04:01.362+00	2026-06-29 12:48:46.991+00	VL
eceb7db1-0c0b-492f-8c44-d41a1331101c	e03e7c83-c093-4188-9bae-e9f289d17cd8	SAR	Sarandë	Sarande	t	2026-06-08 14:04:01.363+00	2026-06-29 12:48:46.992+00	VL
586937f3-f1a6-4cb0-8895-102ac6cdf186	ffbdbde1-a661-4f2d-a05c-acf658b4a35c	SHK	Shkodër	Shkoder	t	2026-06-08 14:04:01.363+00	2026-06-29 12:48:46.992+00	SH
6bb8d6c2-9b2c-4846-8693-eff20b556a9b	71a30361-a700-47a8-8b2d-2cc3d4a433fd	KOR	Korçë	Korce	t	2026-06-08 14:04:01.364+00	2026-06-29 12:48:46.993+00	KO
f1c197b0-297e-4fdf-9646-0411cfc06697	71a30361-a700-47a8-8b2d-2cc3d4a433fd	POG	Pogradec	Pogradec	t	2026-06-08 14:04:01.365+00	2026-06-29 12:48:46.994+00	KO
a4b7d142-f8a0-4028-8a6b-289fc26dfc45	1797dd70-6026-433c-9ff2-189ddbc6851d	GJI	Gjirokastër	Gjirokaster	t	2026-06-08 14:04:01.365+00	2026-06-29 12:48:46.994+00	GJ
5a89c82e-8e9a-4f60-832b-444c6dc92a61	d42bc148-39cc-4cbf-b69c-cabad985feb6	BER	Berat	Berat	t	2026-06-08 14:04:01.366+00	2026-06-29 12:48:46.995+00	BR
b7c814a2-91b1-4b57-88dc-3134c2d5d626	f8cbb686-cc28-4769-9b54-0a8912f46ce5	KUK	Kukës	Kukes	t	2026-06-08 14:04:01.367+00	2026-06-29 12:48:46.996+00	KU
e1291bdd-6f9d-4cff-857d-b1ef325223a6	6fe9c0d4-d56e-494c-8cc9-e2802d49be02	LEZ	Lezhë	Lezhe	t	2026-06-08 14:04:01.367+00	2026-06-29 12:48:46.997+00	LE
26f575f2-6eea-48e9-a576-a4cd59c450e9	47dc20aa-22f4-42b3-ad72-01781c6314a3	DIB	Dibër	Diber	t	2026-06-08 14:04:01.368+00	2026-06-29 12:48:46.997+00	DI
1478eac4-98d9-4e09-bceb-f9ac3b821f0a	badf8958-4ef6-4fe1-b471-747f758d0aea	TIA	Tiranë	Tirana	t	2026-06-08 14:04:01.354+00	2026-06-29 12:48:46.982+00	TR
c1607990-547e-4583-bc60-11532287e8f4	badf8958-4ef6-4fe1-b471-747f758d0aea	KAM	Kamëz	Kamez	t	2026-06-08 14:04:01.355+00	2026-06-29 12:48:46.983+00	TR
c7596187-fd1a-4794-9f47-ba5a4bed7d21	badf8958-4ef6-4fe1-b471-747f758d0aea	VOR	Vorë	Vore	t	2026-06-08 14:04:01.356+00	2026-06-29 12:48:46.984+00	TR
362eda6f-4031-4365-bd52-f4da2682dd5d	badf8958-4ef6-4fe1-b471-747f758d0aea	KAV	Kavajë	Kavaje	t	2026-06-08 14:04:01.357+00	2026-06-29 12:48:46.985+00	TR
bafa88aa-964d-4bc3-92fa-5ce41069a28e	20da97ea-32f4-49ef-99d6-3122348745e8	DUR	Durrës	Durres	t	2026-06-08 14:04:01.358+00	2026-06-29 12:48:46.986+00	DR
86b3083b-600f-444f-abba-6246ec1c7071	20da97ea-32f4-49ef-99d6-3122348745e8	SHI	Shijak	Shijak	t	2026-06-08 14:04:01.358+00	2026-06-29 12:48:46.986+00	DR
3c112a37-525f-4e21-a854-e77529992aa1	20da97ea-32f4-49ef-99d6-3122348745e8	SUK	Sukth	Sukth	t	2026-06-08 14:04:01.359+00	2026-06-29 12:48:46.987+00	DR
7e14406b-17d8-40ec-89a7-de5dc13cbea6	5188902d-31e9-4cdf-9344-027ef02ee210	ELB	Elbasan	Elbasan	t	2026-06-08 14:04:01.36+00	2026-06-29 12:48:46.988+00	EL
\.


--
-- Data for Name: geo_regions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.geo_regions (id, code, name_sq, name_en, is_active, created_at, updated_at) FROM stdin;
d42bc148-39cc-4cbf-b69c-cabad985feb6	BR	Berat	Berat	t	2026-06-08 14:04:01.338+00	2026-06-29 12:48:46.967+00
47dc20aa-22f4-42b3-ad72-01781c6314a3	DI	Dibër	Diber	t	2026-06-08 14:04:01.346+00	2026-06-29 12:48:46.972+00
20da97ea-32f4-49ef-99d6-3122348745e8	DR	Durrës	Durres	t	2026-06-08 14:04:01.347+00	2026-06-29 12:48:46.973+00
5188902d-31e9-4cdf-9344-027ef02ee210	EL	Elbasan	Elbasan	t	2026-06-08 14:04:01.348+00	2026-06-29 12:48:46.974+00
1dd4d403-09e8-43f7-877d-ed5f4f8de072	FR	Fier	Fier	t	2026-06-08 14:04:01.348+00	2026-06-29 12:48:46.975+00
1797dd70-6026-433c-9ff2-189ddbc6851d	GJ	Gjirokastër	Gjirokaster	t	2026-06-08 14:04:01.349+00	2026-06-29 12:48:46.976+00
71a30361-a700-47a8-8b2d-2cc3d4a433fd	KO	Korçë	Korce	t	2026-06-08 14:04:01.35+00	2026-06-29 12:48:46.977+00
f8cbb686-cc28-4769-9b54-0a8912f46ce5	KU	Kukës	Kukes	t	2026-06-08 14:04:01.351+00	2026-06-29 12:48:46.978+00
6fe9c0d4-d56e-494c-8cc9-e2802d49be02	LE	Lezhë	Lezhe	t	2026-06-08 14:04:01.351+00	2026-06-29 12:48:46.979+00
ffbdbde1-a661-4f2d-a05c-acf658b4a35c	SH	Shkodër	Shkoder	t	2026-06-08 14:04:01.352+00	2026-06-29 12:48:46.979+00
badf8958-4ef6-4fe1-b471-747f758d0aea	TR	Tiranë	Tirana	t	2026-06-08 14:04:01.352+00	2026-06-29 12:48:46.98+00
e03e7c83-c093-4188-9bae-e9f289d17cd8	VL	Vlorë	Vlore	t	2026-06-08 14:04:01.353+00	2026-06-29 12:48:46.981+00
\.


--
-- Data for Name: incidents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incidents (id, incident_number, elevator_id, source, type, description, priority, status, occurred_at, reported_by_id, reporter_name, reporter_contact, assigned_to_id, photos, resolution_notes, closed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insp_field_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insp_field_assignments (id, elevator_id, assignee_id, assigned_by_id, scheduled_date, status, instructions, inspection_id, cancelled_at, cancel_reason, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: insp_inspections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.insp_inspections (id, elevator_id, inspector_id, type, status, scheduled_date, conducted_date, result, findings, conditions, next_inspection_date, report_document_id, certificate_id, created_at, updated_at, approved_body_number, examination_type) FROM stdin;
a8927229-efe3-4cb9-9776-3f4452755003	b9f564e5-ba9c-4f30-8b20-326857b1194b	dc957e3b-562c-45ac-9249-f96f3feab648	PERIODIC	PASS	2026-05-15	2026-05-15	PASS	Demo: Inspektim periodik KALUES - ashensor në përputhje.	\N	2027-05-15	\N	\N	2026-06-29 16:50:18.453+00	2026-06-29 16:50:18.453+00	OMI-2026-001	PERIODIC_VISUAL
666dacc8-90e4-4f0e-b851-05da66cb6236	97f291d6-33f4-4c60-a03c-1a17c357bb11	dc957e3b-562c-45ac-9249-f96f3feab648	PERIODIC	FAIL	2026-06-15	2026-06-15	FAIL	Demo: Inspektim periodik JO KALUES - zhurmë e tepërt, kërkohet riparim dhe reinspektim.	\N	2026-12-15	\N	\N	2026-06-29 16:50:18.455+00	2026-06-29 16:50:18.455+00	OMI-2026-001	PERIODIC_VISUAL
\.


--
-- Data for Name: maint_compliance_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maint_compliance_status (id, elevator_id, last_maintenance_date, next_due_date, is_compliant, days_overdue, last_calculated_at) FROM stdin;
f8233f8c-8991-4ec3-a833-0ad1cd2d77ac	b9f564e5-ba9c-4f30-8b20-326857b1194b	2026-06-19	2026-07-19	t	0	2026-06-29 16:50:18.446+00
d6777e20-0875-46d4-a321-e5a91f26cb25	97f291d6-33f4-4c60-a03c-1a17c357bb11	2026-05-20	2026-06-20	f	10	2026-06-29 16:50:18.449+00
\.


--
-- Data for Name: maint_contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maint_contracts (id, elevator_id, maintenance_org_id, contract_number, start_date, end_date, application_id, document_id, is_active, created_at, service_type, rejection_reason, responded_at, status) FROM stdin;
4cbe0b2e-373c-4c69-861f-a5a7f64b59a0	b9f564e5-ba9c-4f30-8b20-326857b1194b	f94b532e-fbba-4d59-bdde-223667b401ec	KM-2026-00001	2026-06-29	2027-06-29	\N	\N	t	2026-06-29 16:50:18.417+00	MAINTENANCE	\N	\N	ACTIVE
e424cf58-2257-4445-beb3-351972e6e0d3	97f291d6-33f4-4c60-a03c-1a17c357bb11	f94b532e-fbba-4d59-bdde-223667b401ec	KM-2026-00002	2026-06-29	2027-06-29	\N	\N	t	2026-06-29 16:50:18.427+00	MAINTENANCE	\N	\N	ACTIVE
5ebff197-4b56-4276-bcd2-8dcc32e3a146	b9f564e5-ba9c-4f30-8b20-326857b1194b	27e8b481-fd73-4aa9-a0dc-24feddae67ea	KI-2026-DEMO-B9F5	2026-05-30	2027-06-29	\N	\N	t	2026-06-29 16:50:18.451+00	PERIODIC_INSPECTION	\N	2026-05-31 16:50:18.451+00	ACTIVE
a0310b06-56cc-402c-966d-7c30d87595f4	97f291d6-33f4-4c60-a03c-1a17c357bb11	27e8b481-fd73-4aa9-a0dc-24feddae67ea	KI-2026-DEMO-97F2	2026-05-30	2027-06-29	\N	\N	t	2026-06-29 16:50:18.452+00	PERIODIC_INSPECTION	\N	2026-05-31 16:50:18.452+00	ACTIVE
\.


--
-- Data for Name: maint_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maint_records (id, elevator_id, maintenance_org_id, type, performed_date, technician_name, description, findings, next_due_date, document_id, created_by, created_at, duration_minutes, end_time, intervention_type, parts_replaced, start_time) FROM stdin;
2ab761e5-164e-461e-b792-ae10f651e0d6	b9f564e5-ba9c-4f30-8b20-326857b1194b	f94b532e-fbba-4d59-bdde-223667b401ec	ROUTINE	2026-06-19	Florian Beqiri	Demo: Kontroll rutinë - vajosje shinore, test sigurie, verifikim dyerve. Ashensori në gjendje normale.	\N	\N	\N	051371ec-0062-4d33-aa1c-49dc94172067	2026-06-29 16:50:18.443+00	150	11:30	Rutinë	\N	09:00
be186e50-20e9-4b11-9e23-0ab61fbdd66d	b9f564e5-ba9c-4f30-8b20-326857b1194b	f94b532e-fbba-4d59-bdde-223667b401ec	ROUTINE	2026-05-31	\N	Demo: Raport mujor i dorëzuar në kohë.	\N	\N	\N	051371ec-0062-4d33-aa1c-49dc94172067	2026-06-29 16:50:18.445+00	\N	\N	RAPORT_MUJOR	\N	\N
837f334a-f7cf-4eef-828a-07c8e4e2aef6	97f291d6-33f4-4c60-a03c-1a17c357bb11	f94b532e-fbba-4d59-bdde-223667b401ec	EMERGENCY	2026-05-20	Florian Beqiri	Demo: Ndërhyrje emergjence për zhurmë - u zëvendësua rulmenti. Mungon raporti mujor i muajit aktual (alarm).	\N	\N	\N	051371ec-0062-4d33-aa1c-49dc94172067	2026-06-29 16:50:18.447+00	180	17:00	Emergjencë	Rulment primary sheave	14:00
\.


--
-- Data for Name: org_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_invitations (id, organization_id, email, first_name, last_name, role_id, token_hash, status, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at) FROM stdin;
\.


--
-- Data for Name: org_licenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_licenses (id, organization_id, license_number, license_type, issued_date, expiry_date, scope, status, issued_by, document_id, created_at, updated_at, created_by) FROM stdin;
cda0eb42-1a4c-452c-b089-429b03534702	09cb9b77-fbc2-4941-b500-36e14311474a	INST-2026-001	INSTALLATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.315+00	2026-06-29 16:50:18.315+00	\N
ecb6c060-b777-48eb-80ed-6bf68b0fda91	cae8924f-6480-4b10-bef1-55fe1019defe	INST-2026-002	INSTALLATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.319+00	2026-06-29 16:50:18.319+00	\N
d4d9d72c-d258-48f2-89be-b06250858e68	d0efaa83-8e30-4243-8887-9faedbe6f59e	INST-2026-003	INSTALLATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.321+00	2026-06-29 16:50:18.321+00	\N
f92c53c6-e9bb-4a11-a0bf-a156d34bfb56	27e8b481-fd73-4aa9-a0dc-24feddae67ea	OMI-2026-001	CERTIFICATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.323+00	2026-06-29 16:50:18.323+00	\N
64a97f4a-29d7-4015-8819-23e2fb8a6a26	346b10a2-20a8-4a76-aa1d-3ff785a2903e	OMI-2026-002	CERTIFICATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.325+00	2026-06-29 16:50:18.325+00	\N
f9855474-8a6a-4cb9-b6eb-89d4ab7b6b4e	16bb4ab8-bdf9-4feb-ae2c-0b2112aa89b6	OMI-2026-003	CERTIFICATION	2026-01-01	2028-06-29	\N	ACTIVE	Drejtoria e Politikave të Tregut të Brendshëm	\N	2026-06-29 16:50:18.327+00	2026-06-29 16:50:18.327+00	\N
\.


--
-- Data for Name: org_memberships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_memberships (id, user_id, organization_id, role_id, is_primary, joined_at, deactivated_at) FROM stdin;
2dd676ea-f284-4110-8175-2c8308eec9e9	49ed9bc5-4f11-4d90-b449-9bdc3f478fba	be79a239-0a26-405c-951e-d130c85f9650	98ef1acf-6743-453a-aa9a-ea34087bfc4e	t	2026-06-29 16:50:18.334+00	\N
53aa2af9-b9a4-4711-a4c0-7fc797bcd9eb	57d5062f-81dc-41ba-a9be-9ecf951779d2	be79a239-0a26-405c-951e-d130c85f9650	03406615-cfb1-4538-8f3a-51eb248cebc5	t	2026-06-29 16:50:18.338+00	\N
6cf0168e-eabf-4d23-a020-243025e9b2c0	78094869-c446-4768-8867-4dfcba5597f4	be79a239-0a26-405c-951e-d130c85f9650	7bd0b03b-09f6-4bd0-be9f-15cc83d49cfa	t	2026-06-29 16:50:18.34+00	\N
d1b52b96-b73b-4e47-8ba7-69d321bb0a1f	4d9ce964-97e8-4a2a-884f-4bf30a1fe2a1	be79a239-0a26-405c-951e-d130c85f9650	856b2caf-7b17-4ca4-810b-6393cc600193	t	2026-06-29 16:50:18.343+00	\N
92091095-8ca0-4c74-87e8-a45f2b47424f	9f66cd77-704f-4ed3-b86d-54b6ed617e85	be79a239-0a26-405c-951e-d130c85f9650	189ac18f-597f-4267-a86f-a61ae41a65f9	t	2026-06-29 16:50:18.344+00	\N
1110d9bb-f4be-47b0-8826-3ed27025f5db	c0a1df90-2b21-4b81-9be9-86b0f3b77144	be79a239-0a26-405c-951e-d130c85f9650	752197a2-d2c2-4a33-a275-c834a1b92ba1	t	2026-06-29 16:50:18.346+00	\N
4dd97dcb-62d8-4155-8c46-0b953da34835	1057d064-3b66-4e9b-be03-5c8a42612aff	7abe5222-e0b6-4d07-9392-b27f549bee15	f7ac2e62-c886-430d-8988-a7e7e17005ff	t	2026-06-29 16:50:18.348+00	\N
722bbd1d-bdde-4d11-a1b7-4e92e5307397	b422b73a-6c91-4228-810c-bc03e3630c4d	a102599a-06e5-4928-843b-e0110dc8b64a	ad355007-a62c-4edf-8471-5a457e230d35	t	2026-06-29 16:50:18.35+00	\N
8f82c4ec-ac53-4866-864b-6ea97aa34023	e26021bc-fbb0-4171-81c6-277306bc418a	09cb9b77-fbc2-4941-b500-36e14311474a	60367fc2-ad42-45ac-b7e0-be22ba66a47c	t	2026-06-29 16:50:18.353+00	\N
1004bfa0-ae55-4969-8ffb-94af85d4b1fc	f78965fe-4f64-425f-9668-b95fc2871962	cae8924f-6480-4b10-bef1-55fe1019defe	60367fc2-ad42-45ac-b7e0-be22ba66a47c	t	2026-06-29 16:50:18.354+00	\N
1201f319-16cb-4cf0-8668-949363b27d1a	67d8ec7c-11f4-4a52-9eaf-277fa482e9f8	d0efaa83-8e30-4243-8887-9faedbe6f59e	60367fc2-ad42-45ac-b7e0-be22ba66a47c	t	2026-06-29 16:50:18.356+00	\N
10027160-7f38-4196-bbbe-b3ba3a6dc5b4	dc957e3b-562c-45ac-9249-f96f3feab648	27e8b481-fd73-4aa9-a0dc-24feddae67ea	afcc03f2-4c46-4ee6-9766-edc2637decb9	t	2026-06-29 16:50:18.357+00	\N
2228ea08-30de-4232-a4c4-2f8e984a6fb7	ab1be32c-e287-45c0-9b1a-b0950cb2a8e8	346b10a2-20a8-4a76-aa1d-3ff785a2903e	afcc03f2-4c46-4ee6-9766-edc2637decb9	t	2026-06-29 16:50:18.358+00	\N
46b4319c-441e-41be-b41a-8c3baca84b0b	bddfa7c2-231f-4776-9a12-ada6ffdcc3a0	16bb4ab8-bdf9-4feb-ae2c-0b2112aa89b6	afcc03f2-4c46-4ee6-9766-edc2637decb9	t	2026-06-29 16:50:18.36+00	\N
57ec843a-331e-4692-9e5f-99a9f9aa8dc3	051371ec-0062-4d33-aa1c-49dc94172067	f94b532e-fbba-4d59-bdde-223667b401ec	cf4e7312-eb91-4964-98ab-aec49f490de0	t	2026-06-29 16:50:18.361+00	\N
a4689879-c400-47b1-88cb-53beb68a41c1	6bba841c-4c01-4872-96af-d7109adab19e	cdedc206-cdb8-4d73-9e84-748eac46d475	cf4e7312-eb91-4964-98ab-aec49f490de0	t	2026-06-29 16:50:18.363+00	\N
\.


--
-- Data for Name: org_organizations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_organizations (id, type, name, nipt, legal_form, address, municipality_id, phone, email, status, qkb_validated, qkb_validated_at, qkb_validation_data, created_at, updated_at, deleted_at, created_by, owner_building_role, representative_email, representative_name, representative_nid, representative_phone) FROM stdin;
be79a239-0a26-405c-951e-d130c85f9650	ISHMT	ISHMT - Inspektorati Shtetëror i Tregut të Brendshëm	ISHMT-GOV-0001	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	info@ishmt.gov.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.304+00	2026-06-29 16:50:18.304+00	\N	\N	\N	\N	\N	\N	\N
7abe5222-e0b6-4d07-9392-b27f549bee15	DIRECTORATE	Drejtoria e Politikave të Tregut të Brendshëm	DIR-MPB-0001	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	drejtoria@ishmt.gov.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.31+00	2026-06-29 16:50:18.31+00	\N	\N	\N	\N	\N	\N	\N
a102599a-06e5-4928-843b-e0110dc8b64a	OWNER	Personi Përgjegjës Shembull (Person Fizik)	\N	\N	Rruga Myslym Shyri, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	\N	ACTIVE	f	\N	\N	2026-06-29 16:50:18.311+00	2026-06-29 16:50:18.311+00	\N	\N	\N	\N	\N	\N	\N
09cb9b77-fbc2-4941-b500-36e14311474a	INSTALLER	Ashensorë Pro Sh.p.k.	K11111111A	\N	Rruga e Durrësit, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	+355 4 2100100	info@ashensorepro.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.313+00	2026-06-29 16:50:18.313+00	\N	\N	\N	\N	\N	\N	\N
cae8924f-6480-4b10-bef1-55fe1019defe	INSTALLER	Lift Master Albania Sh.p.k.	L10000001A	\N	Rruga Kavajës, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	+355 4 2200200	zyra@liftmaster.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.318+00	2026-06-29 16:50:18.318+00	\N	\N	\N	\N	\N	\N	\N
d0efaa83-8e30-4243-8887-9faedbe6f59e	INSTALLER	Euro Ashensorë Sh.p.k.	L10000002B	\N	Rruga e Elbasanit, Tiranë	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	+355 4 2300300	info@euroashensore.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.32+00	2026-06-29 16:50:18.32+00	\N	\N	\N	\N	\N	\N	\N
27e8b481-fd73-4aa9-a0dc-24feddae67ea	CERTIFIER	OMI Certifikim Sh.p.k.	K22222222B	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	info@omicert.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.322+00	2026-06-29 16:50:18.322+00	\N	\N	\N	\N	\N	\N	\N
346b10a2-20a8-4a76-aa1d-3ff785a2903e	CERTIFIER	Inspekt OMI Sh.p.k.	M20000001A	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	kontakt@inspektomi.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.324+00	2026-06-29 16:50:18.324+00	\N	\N	\N	\N	\N	\N	\N
16bb4ab8-bdf9-4feb-ae2c-0b2112aa89b6	CERTIFIER	Quality Lift Cert Sh.p.k.	M20000002B	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	info@qualitylift.al	ACTIVE	f	\N	\N	2026-06-29 16:50:18.326+00	2026-06-29 16:50:18.326+00	\N	\N	\N	\N	\N	\N	\N
f94b532e-fbba-4d59-bdde-223667b401ec	MAINTENANCE	Mirëmbajtje Ashensorësh Sh.p.k.	K33333333C	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	info@servisashensore.al	ACTIVE	t	2026-06-29 16:50:18.327+00	\N	2026-06-29 16:50:18.328+00	2026-06-29 16:50:18.328+00	\N	\N	\N	\N	\N	\N	\N
cdedc206-cdb8-4d73-9e84-748eac46d475	MAINTENANCE	Servis Lift 24 Sh.p.k.	N30000001A	\N	\N	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	\N	info@servislift24.al	ACTIVE	t	2026-06-29 16:50:18.329+00	\N	2026-06-29 16:50:18.329+00	2026-06-29 16:50:18.329+00	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: org_qkb_validations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.org_qkb_validations (id, organization_id, nipt, request_data, response_data, status, validated_at, created_at, initiated_by) FROM stdin;
\.


--
-- Data for Name: qr_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.qr_codes (id, elevator_id, code, is_active, generated_at, deactivated_at, scan_count, image_document_id, placement_confirmed_at, placement_confirmed_by, placement_photo_document_id) FROM stdin;
\.


--
-- Data for Name: qr_scan_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.qr_scan_logs (id, qr_code_id, scanned_at, ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: sys_application_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_application_sequences (id, year, type_code, last_sequence) FROM stdin;
dba01aec-05c5-4201-b258-f6e8929413bc	2026	REG	7
\.


--
-- Data for Name: sys_certificate_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_certificate_sequences (id, year, type_code, last_sequence) FROM stdin;
842ebd28-8852-4b5c-9f60-f3fe30e2b41c	2026	REG	2
\.


--
-- Data for Name: sys_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_config (key, value, description, updated_by, updated_at) FROM stdin;
\.


--
-- Data for Name: sys_job_runs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_job_runs (id, job_type, status, started_at, completed_at, metadata, error_log) FROM stdin;
\.


--
-- Data for Name: sys_legacy_registry_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_legacy_registry_sequences (id, municipality_id, last_sequence) FROM stdin;
af4fede5-1130-4640-9338-ef302b92103f	1478eac4-98d9-4e09-bceb-f9ac3b821f0a	902
\.


--
-- Data for Name: sys_notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_notification_preferences (id, user_id, channel, enabled, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sys_notification_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_notification_templates (id, code, channel, subject, body, variables, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sys_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_notifications (id, user_id, channel, status, title, body, entity_type, entity_id, read_at, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: sys_registry_sequences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_registry_sequences (id, municipality_id, year, last_sequence) FROM stdin;
\.


--
-- Data for Name: sys_reminder_rules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_reminder_rules (id, entity_type, days_before, channel, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: sys_scheduled_reminders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sys_scheduled_reminders (id, entity_type, entity_id, elevator_id, user_id, channel, days_before, target_date, scheduled_for, sent_at, created_at) FROM stdin;
\.


--
-- Name: app_application_data app_application_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_application_data
    ADD CONSTRAINT app_application_data_pkey PRIMARY KEY (id);


--
-- Name: app_applications app_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_pkey PRIMARY KEY (id);


--
-- Name: app_delegations app_delegations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_delegations
    ADD CONSTRAINT app_delegations_pkey PRIMARY KEY (id);


--
-- Name: app_workflow_history app_workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_workflow_history
    ADD CONSTRAINT app_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_accounts auth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);


--
-- Name: auth_password_reset_tokens auth_password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_reset_tokens
    ADD CONSTRAINT auth_password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_permissions auth_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permissions
    ADD CONSTRAINT auth_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_role_permissions auth_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_role_permissions
    ADD CONSTRAINT auth_role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: auth_roles auth_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_roles
    ADD CONSTRAINT auth_roles_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: cert_certificates cert_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_pkey PRIMARY KEY (id);


--
-- Name: cit_report_actions cit_report_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_report_actions
    ADD CONSTRAINT cit_report_actions_pkey PRIMARY KEY (id);


--
-- Name: cit_reports cit_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_reports
    ADD CONSTRAINT cit_reports_pkey PRIMARY KEY (id);


--
-- Name: doc_access_log doc_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_access_log
    ADD CONSTRAINT doc_access_log_pkey PRIMARY KEY (id);


--
-- Name: doc_document_links doc_document_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_document_links
    ADD CONSTRAINT doc_document_links_pkey PRIMARY KEY (id);


--
-- Name: doc_documents doc_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_documents
    ADD CONSTRAINT doc_documents_pkey PRIMARY KEY (id);


--
-- Name: doc_templates doc_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_templates
    ADD CONSTRAINT doc_templates_pkey PRIMARY KEY (id);


--
-- Name: elv_compliance_status elv_compliance_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_compliance_status
    ADD CONSTRAINT elv_compliance_status_pkey PRIMARY KEY (id);


--
-- Name: elv_delegation_history elv_delegation_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_delegation_history
    ADD CONSTRAINT elv_delegation_history_pkey PRIMARY KEY (id);


--
-- Name: elv_elevators elv_elevators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_pkey PRIMARY KEY (id);


--
-- Name: elv_ownership_history elv_ownership_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_pkey PRIMARY KEY (id);


--
-- Name: elv_responsible_entities elv_responsible_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_responsible_entities
    ADD CONSTRAINT elv_responsible_entities_pkey PRIMARY KEY (id);


--
-- Name: elv_status_history elv_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_status_history
    ADD CONSTRAINT elv_status_history_pkey PRIMARY KEY (id);


--
-- Name: elv_technical_data elv_technical_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data
    ADD CONSTRAINT elv_technical_data_pkey PRIMARY KEY (id);


--
-- Name: elv_technical_data_versions elv_technical_data_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data_versions
    ADD CONSTRAINT elv_technical_data_versions_pkey PRIMARY KEY (id);


--
-- Name: geo_administrative_units geo_administrative_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_administrative_units
    ADD CONSTRAINT geo_administrative_units_pkey PRIMARY KEY (id);


--
-- Name: geo_buildings geo_buildings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_buildings
    ADD CONSTRAINT geo_buildings_pkey PRIMARY KEY (id);


--
-- Name: geo_municipalities geo_municipalities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_municipalities
    ADD CONSTRAINT geo_municipalities_pkey PRIMARY KEY (id);


--
-- Name: geo_regions geo_regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_regions
    ADD CONSTRAINT geo_regions_pkey PRIMARY KEY (id);


--
-- Name: incidents incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);


--
-- Name: insp_field_assignments insp_field_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_field_assignments
    ADD CONSTRAINT insp_field_assignments_pkey PRIMARY KEY (id);


--
-- Name: insp_inspections insp_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_inspections
    ADD CONSTRAINT insp_inspections_pkey PRIMARY KEY (id);


--
-- Name: maint_compliance_status maint_compliance_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_compliance_status
    ADD CONSTRAINT maint_compliance_status_pkey PRIMARY KEY (id);


--
-- Name: maint_contracts maint_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_contracts
    ADD CONSTRAINT maint_contracts_pkey PRIMARY KEY (id);


--
-- Name: maint_records maint_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_records
    ADD CONSTRAINT maint_records_pkey PRIMARY KEY (id);


--
-- Name: org_invitations org_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_invitations
    ADD CONSTRAINT org_invitations_pkey PRIMARY KEY (id);


--
-- Name: org_licenses org_licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_licenses
    ADD CONSTRAINT org_licenses_pkey PRIMARY KEY (id);


--
-- Name: org_memberships org_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_memberships
    ADD CONSTRAINT org_memberships_pkey PRIMARY KEY (id);


--
-- Name: org_organizations org_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_organizations
    ADD CONSTRAINT org_organizations_pkey PRIMARY KEY (id);


--
-- Name: org_qkb_validations org_qkb_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_qkb_validations
    ADD CONSTRAINT org_qkb_validations_pkey PRIMARY KEY (id);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (id);


--
-- Name: qr_scan_logs qr_scan_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs
    ADD CONSTRAINT qr_scan_logs_pkey PRIMARY KEY (id);


--
-- Name: sys_application_sequences sys_application_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_application_sequences
    ADD CONSTRAINT sys_application_sequences_pkey PRIMARY KEY (id);


--
-- Name: sys_certificate_sequences sys_certificate_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_certificate_sequences
    ADD CONSTRAINT sys_certificate_sequences_pkey PRIMARY KEY (id);


--
-- Name: sys_config sys_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_config
    ADD CONSTRAINT sys_config_pkey PRIMARY KEY (key);


--
-- Name: sys_job_runs sys_job_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_job_runs
    ADD CONSTRAINT sys_job_runs_pkey PRIMARY KEY (id);


--
-- Name: sys_legacy_registry_sequences sys_legacy_registry_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_legacy_registry_sequences
    ADD CONSTRAINT sys_legacy_registry_sequences_pkey PRIMARY KEY (id);


--
-- Name: sys_notification_preferences sys_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_notification_preferences
    ADD CONSTRAINT sys_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: sys_notification_templates sys_notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_notification_templates
    ADD CONSTRAINT sys_notification_templates_pkey PRIMARY KEY (id);


--
-- Name: sys_notifications sys_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_notifications
    ADD CONSTRAINT sys_notifications_pkey PRIMARY KEY (id);


--
-- Name: sys_registry_sequences sys_registry_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_registry_sequences
    ADD CONSTRAINT sys_registry_sequences_pkey PRIMARY KEY (id);


--
-- Name: sys_reminder_rules sys_reminder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_reminder_rules
    ADD CONSTRAINT sys_reminder_rules_pkey PRIMARY KEY (id);


--
-- Name: sys_scheduled_reminders sys_scheduled_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_scheduled_reminders
    ADD CONSTRAINT sys_scheduled_reminders_pkey PRIMARY KEY (id);


--
-- Name: app_application_data_application_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX app_application_data_application_id_key ON public.app_application_data USING btree (application_id);


--
-- Name: app_applications_application_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX app_applications_application_number_key ON public.app_applications USING btree (application_number);


--
-- Name: auth_accounts_provider_provider_account_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_accounts_provider_provider_account_id_key ON public.auth_accounts USING btree (provider, provider_account_id);


--
-- Name: auth_password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_password_reset_tokens_token_hash_key ON public.auth_password_reset_tokens USING btree (token_hash);


--
-- Name: auth_permissions_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_permissions_code_key ON public.auth_permissions USING btree (code);


--
-- Name: auth_roles_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_roles_code_key ON public.auth_roles USING btree (code);


--
-- Name: auth_sessions_session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_sessions_session_token_key ON public.auth_sessions USING btree (session_token);


--
-- Name: auth_users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_users_email_key ON public.auth_users USING btree (email);


--
-- Name: auth_users_nid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_users_nid_key ON public.auth_users USING btree (nid);


--
-- Name: auth_verification_tokens_identifier_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_verification_tokens_identifier_token_key ON public.auth_verification_tokens USING btree (identifier, token);


--
-- Name: auth_verification_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX auth_verification_tokens_token_key ON public.auth_verification_tokens USING btree (token);


--
-- Name: cert_certificates_certificate_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cert_certificates_certificate_number_key ON public.cert_certificates USING btree (certificate_number);


--
-- Name: cit_reports_report_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cit_reports_report_number_key ON public.cit_reports USING btree (report_number);


--
-- Name: elv_compliance_status_elevator_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elv_compliance_status_elevator_id_key ON public.elv_compliance_status USING btree (elevator_id);


--
-- Name: elv_elevators_application_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elv_elevators_application_id_key ON public.elv_elevators USING btree (application_id);


--
-- Name: elv_elevators_registry_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elv_elevators_registry_number_key ON public.elv_elevators USING btree (registry_number);


--
-- Name: elv_technical_data_current_version_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elv_technical_data_current_version_id_key ON public.elv_technical_data USING btree (current_version_id);


--
-- Name: elv_technical_data_elevator_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX elv_technical_data_elevator_id_key ON public.elv_technical_data USING btree (elevator_id);


--
-- Name: geo_buildings_building_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX geo_buildings_building_code_key ON public.geo_buildings USING btree (building_code);


--
-- Name: geo_municipalities_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX geo_municipalities_code_key ON public.geo_municipalities USING btree (code);


--
-- Name: geo_regions_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX geo_regions_code_key ON public.geo_regions USING btree (code);


--
-- Name: idx_admin_unit_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_unit_municipality ON public.geo_administrative_units USING btree (municipality_id);


--
-- Name: idx_app_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_active ON public.app_applications USING btree (deleted_at);


--
-- Name: idx_app_certifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_certifier ON public.app_applications USING btree (certifier_org_id);


--
-- Name: idx_app_delegation_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_delegation_app ON public.app_delegations USING btree (application_id);


--
-- Name: idx_app_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_inspector ON public.app_applications USING btree (assigned_inspector_id);


--
-- Name: idx_app_installer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_installer ON public.app_applications USING btree (installer_org_id);


--
-- Name: idx_app_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_number ON public.app_applications USING btree (application_number);


--
-- Name: idx_app_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_owner ON public.app_applications USING btree (owner_org_id);


--
-- Name: idx_app_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_status ON public.app_applications USING btree (status);


--
-- Name: idx_app_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_type ON public.app_applications USING btree (type);


--
-- Name: idx_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_actor ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_correlation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_correlation ON public.audit_logs USING btree (correlation_id);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_auth_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_active ON public.auth_users USING btree (deleted_at);


--
-- Name: idx_auth_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_email ON public.auth_users USING btree (email);


--
-- Name: idx_auth_users_nid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_users_nid ON public.auth_users USING btree (nid);


--
-- Name: idx_building_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_active ON public.geo_buildings USING btree (deleted_at);


--
-- Name: idx_building_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_address ON public.geo_buildings USING btree (address);


--
-- Name: idx_building_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_municipality ON public.geo_buildings USING btree (municipality_id);


--
-- Name: idx_building_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_building_owner ON public.geo_buildings USING btree (primary_owner_org_id);


--
-- Name: idx_cert_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_elv ON public.cert_certificates USING btree (elevator_id);


--
-- Name: idx_cert_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_expiry ON public.cert_certificates USING btree (expiry_date);


--
-- Name: idx_cert_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_number ON public.cert_certificates USING btree (certificate_number);


--
-- Name: idx_cert_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_status ON public.cert_certificates USING btree (status);


--
-- Name: idx_cert_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_type ON public.cert_certificates USING btree (type);


--
-- Name: idx_cit_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cit_elv ON public.cit_reports USING btree (elevator_id);


--
-- Name: idx_cit_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cit_inspector ON public.cit_reports USING btree (assigned_inspector_id);


--
-- Name: idx_cit_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cit_priority ON public.cit_reports USING btree (priority);


--
-- Name: idx_cit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cit_status ON public.cit_reports USING btree (status);


--
-- Name: idx_cit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cit_type ON public.cit_reports USING btree (type);


--
-- Name: idx_compliance_indicator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_compliance_indicator ON public.elv_compliance_status USING btree (indicator);


--
-- Name: idx_delegation_hist_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delegation_hist_elv ON public.elv_delegation_history USING btree (elevator_id);


--
-- Name: idx_delegation_hist_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delegation_hist_org ON public.elv_delegation_history USING btree (organization_id);


--
-- Name: idx_doc_access_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_access_document ON public.doc_access_log USING btree (document_id);


--
-- Name: idx_doc_classification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_classification ON public.doc_documents USING btree (classification);


--
-- Name: idx_doc_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_uploaded_by ON public.doc_documents USING btree (uploaded_by);


--
-- Name: idx_doclink_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doclink_doc ON public.doc_document_links USING btree (document_id);


--
-- Name: idx_doclink_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doclink_entity ON public.doc_document_links USING btree (entity_type, entity_id);


--
-- Name: idx_elv_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_active ON public.elv_elevators USING btree (deleted_at);


--
-- Name: idx_elv_building; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_building ON public.elv_elevators USING btree (building_id);


--
-- Name: idx_elv_maintenance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_maintenance ON public.elv_elevators USING btree (maintenance_org_id);


--
-- Name: idx_elv_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_municipality ON public.elv_elevators USING btree (municipality_id);


--
-- Name: idx_elv_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_owner ON public.elv_elevators USING btree (owner_org_id);


--
-- Name: idx_elv_registry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_registry ON public.elv_elevators USING btree (registry_number);


--
-- Name: idx_elv_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_elv_status ON public.elv_elevators USING btree (status);


--
-- Name: idx_field_insp_assignee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_insp_assignee ON public.insp_field_assignments USING btree (assignee_id, status);


--
-- Name: idx_field_insp_elevator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_insp_elevator ON public.insp_field_assignments USING btree (elevator_id);


--
-- Name: idx_field_insp_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_field_insp_scheduled ON public.insp_field_assignments USING btree (scheduled_date);


--
-- Name: idx_geo_municipality_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_municipality_code ON public.geo_municipalities USING btree (code);


--
-- Name: idx_geo_municipality_region; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_municipality_region ON public.geo_municipalities USING btree (region_id);


--
-- Name: idx_incident_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_elv ON public.incidents USING btree (elevator_id);


--
-- Name: idx_incident_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_priority ON public.incidents USING btree (priority);


--
-- Name: idx_incident_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_status ON public.incidents USING btree (status);


--
-- Name: idx_insp_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insp_elv ON public.insp_inspections USING btree (elevator_id);


--
-- Name: idx_insp_inspector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insp_inspector ON public.insp_inspections USING btree (inspector_id);


--
-- Name: idx_insp_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insp_scheduled ON public.insp_inspections USING btree (scheduled_date);


--
-- Name: idx_insp_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insp_status ON public.insp_inspections USING btree (status);


--
-- Name: idx_invitation_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_email ON public.org_invitations USING btree (email);


--
-- Name: idx_invitation_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_expires ON public.org_invitations USING btree (expires_at);


--
-- Name: idx_invitation_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_org ON public.org_invitations USING btree (organization_id);


--
-- Name: idx_invitation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitation_status ON public.org_invitations USING btree (status);


--
-- Name: idx_job_run_type_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_run_type_started ON public.sys_job_runs USING btree (job_type, started_at);


--
-- Name: idx_license_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_license_expiry ON public.org_licenses USING btree (expiry_date);


--
-- Name: idx_license_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_license_number ON public.org_licenses USING btree (license_number);


--
-- Name: idx_license_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_license_org ON public.org_licenses USING btree (organization_id);


--
-- Name: idx_maint_contract_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_contract_elv ON public.maint_contracts USING btree (elevator_id);


--
-- Name: idx_maint_contract_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_contract_org ON public.maint_contracts USING btree (maintenance_org_id);


--
-- Name: idx_maint_contract_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_contract_status ON public.maint_contracts USING btree (status);


--
-- Name: idx_maint_record_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_record_date ON public.maint_records USING btree (performed_date);


--
-- Name: idx_maint_record_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_record_elv ON public.maint_records USING btree (elevator_id);


--
-- Name: idx_maint_record_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maint_record_org ON public.maint_records USING btree (maintenance_org_id);


--
-- Name: idx_membership_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_org ON public.org_memberships USING btree (organization_id);


--
-- Name: idx_membership_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_user ON public.org_memberships USING btree (user_id);


--
-- Name: idx_notif_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_status ON public.sys_notifications USING btree (status);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_user ON public.sys_notifications USING btree (user_id);


--
-- Name: idx_org_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_active ON public.org_organizations USING btree (deleted_at);


--
-- Name: idx_org_municipality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_municipality ON public.org_organizations USING btree (municipality_id);


--
-- Name: idx_org_nipt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_nipt ON public.org_organizations USING btree (nipt);


--
-- Name: idx_org_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_type_status ON public.org_organizations USING btree (type, status);


--
-- Name: idx_ownership_hist_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ownership_hist_elv ON public.elv_ownership_history USING btree (elevator_id);


--
-- Name: idx_password_reset_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_expires ON public.auth_password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_user ON public.auth_password_reset_tokens USING btree (user_id);


--
-- Name: idx_qkb_validation_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qkb_validation_org ON public.org_qkb_validations USING btree (organization_id);


--
-- Name: idx_qr_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_active ON public.qr_codes USING btree (is_active);


--
-- Name: idx_qr_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_code ON public.qr_codes USING btree (code);


--
-- Name: idx_qr_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_elv ON public.qr_codes USING btree (elevator_id);


--
-- Name: idx_resp_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resp_elv ON public.elv_responsible_entities USING btree (elevator_id);


--
-- Name: idx_resp_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resp_org ON public.elv_responsible_entities USING btree (organization_id);


--
-- Name: idx_scan_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_date ON public.qr_scan_logs USING btree (scanned_at);


--
-- Name: idx_scan_qr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scan_qr ON public.qr_scan_logs USING btree (qr_code_id);


--
-- Name: idx_scheduled_reminder_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_reminder_due ON public.sys_scheduled_reminders USING btree (scheduled_for, sent_at);


--
-- Name: idx_scheduled_reminder_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_reminder_entity ON public.sys_scheduled_reminders USING btree (entity_type, entity_id);


--
-- Name: idx_status_hist_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_hist_elv ON public.elv_status_history USING btree (elevator_id);


--
-- Name: idx_technical_version_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_technical_version_current ON public.elv_technical_data_versions USING btree (is_current);


--
-- Name: idx_technical_version_elv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_technical_version_elv ON public.elv_technical_data_versions USING btree (elevator_id);


--
-- Name: idx_template_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_type_active ON public.doc_templates USING btree (type, is_active);


--
-- Name: idx_workflow_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_actor ON public.app_workflow_history USING btree (actor_id);


--
-- Name: idx_workflow_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_app ON public.app_workflow_history USING btree (application_id);


--
-- Name: incidents_incident_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX incidents_incident_number_key ON public.incidents USING btree (incident_number);


--
-- Name: insp_field_assignments_inspection_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX insp_field_assignments_inspection_id_key ON public.insp_field_assignments USING btree (inspection_id);


--
-- Name: insp_inspections_certificate_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX insp_inspections_certificate_id_key ON public.insp_inspections USING btree (certificate_id);


--
-- Name: maint_compliance_status_elevator_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX maint_compliance_status_elevator_id_key ON public.maint_compliance_status USING btree (elevator_id);


--
-- Name: org_invitations_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_invitations_token_hash_key ON public.org_invitations USING btree (token_hash);


--
-- Name: org_organizations_nipt_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX org_organizations_nipt_key ON public.org_organizations USING btree (nipt);


--
-- Name: qr_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX qr_codes_code_key ON public.qr_codes USING btree (code);


--
-- Name: sys_notification_templates_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sys_notification_templates_code_key ON public.sys_notification_templates USING btree (code);


--
-- Name: uq_admin_unit_municipality_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_admin_unit_municipality_code ON public.geo_administrative_units USING btree (municipality_id, code);


--
-- Name: uq_app_delegation; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_app_delegation ON public.app_delegations USING btree (application_id, organization_id, access_type);


--
-- Name: uq_app_seq_year_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_app_seq_year_type ON public.sys_application_sequences USING btree (year, type_code);


--
-- Name: uq_cert_seq_year_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cert_seq_year_type ON public.sys_certificate_sequences USING btree (year, type_code);


--
-- Name: uq_legacy_registry_seq_mun; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_legacy_registry_seq_mun ON public.sys_legacy_registry_sequences USING btree (municipality_id);


--
-- Name: uq_notif_pref_user_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_notif_pref_user_channel ON public.sys_notification_preferences USING btree (user_id, channel);


--
-- Name: uq_registry_seq_mun_year; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_registry_seq_mun_year ON public.sys_registry_sequences USING btree (municipality_id, year);


--
-- Name: uq_reminder_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_reminder_rule ON public.sys_reminder_rules USING btree (entity_type, days_before, channel);


--
-- Name: uq_technical_version_elv_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_technical_version_elv_number ON public.elv_technical_data_versions USING btree (elevator_id, version_number);


--
-- Name: uq_template_name_version; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_template_name_version ON public.doc_templates USING btree (name, version);


--
-- Name: uq_user_org_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_org_role ON public.org_memberships USING btree (user_id, organization_id, role_id);


--
-- Name: app_application_data app_application_data_administrative_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_application_data
    ADD CONSTRAINT app_application_data_administrative_unit_id_fkey FOREIGN KEY (administrative_unit_id) REFERENCES public.geo_administrative_units(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_application_data app_application_data_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_application_data
    ADD CONSTRAINT app_application_data_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_application_data app_application_data_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_application_data
    ADD CONSTRAINT app_application_data_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_applications app_applications_assigned_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_assigned_inspector_id_fkey FOREIGN KEY (assigned_inspector_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_applications app_applications_certifier_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_certifier_org_id_fkey FOREIGN KEY (certifier_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_applications app_applications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_applications app_applications_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_applications app_applications_installer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_installer_org_id_fkey FOREIGN KEY (installer_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_applications app_applications_owner_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_applications app_applications_returned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_applications
    ADD CONSTRAINT app_applications_returned_by_fkey FOREIGN KEY (returned_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: app_delegations app_delegations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_delegations
    ADD CONSTRAINT app_delegations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_delegations app_delegations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_delegations
    ADD CONSTRAINT app_delegations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_delegations app_delegations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_delegations
    ADD CONSTRAINT app_delegations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_workflow_history app_workflow_history_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_workflow_history
    ADD CONSTRAINT app_workflow_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: app_workflow_history app_workflow_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_workflow_history
    ADD CONSTRAINT app_workflow_history_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: auth_accounts auth_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auth_password_reset_tokens auth_password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_password_reset_tokens
    ADD CONSTRAINT auth_password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auth_role_permissions auth_role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_role_permissions
    ADD CONSTRAINT auth_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.auth_permissions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auth_role_permissions auth_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_role_permissions
    ADD CONSTRAINT auth_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.auth_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cert_certificates cert_certificates_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cert_certificates cert_certificates_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cert_certificates cert_certificates_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cert_certificates cert_certificates_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.insp_inspections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cert_certificates cert_certificates_issued_by_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_issued_by_org_id_fkey FOREIGN KEY (issued_by_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cert_certificates cert_certificates_issued_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_issued_by_user_id_fkey FOREIGN KEY (issued_by_user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cert_certificates cert_certificates_superseded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cert_certificates
    ADD CONSTRAINT cert_certificates_superseded_by_id_fkey FOREIGN KEY (superseded_by_id) REFERENCES public.cert_certificates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cit_report_actions cit_report_actions_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_report_actions
    ADD CONSTRAINT cit_report_actions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cit_report_actions cit_report_actions_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_report_actions
    ADD CONSTRAINT cit_report_actions_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.cit_reports(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cit_reports cit_reports_assigned_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_reports
    ADD CONSTRAINT cit_reports_assigned_inspector_id_fkey FOREIGN KEY (assigned_inspector_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cit_reports cit_reports_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_reports
    ADD CONSTRAINT cit_reports_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cit_reports cit_reports_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_reports
    ADD CONSTRAINT cit_reports_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cit_reports cit_reports_reporter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cit_reports
    ADD CONSTRAINT cit_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: doc_access_log doc_access_log_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_access_log
    ADD CONSTRAINT doc_access_log_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: doc_access_log doc_access_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_access_log
    ADD CONSTRAINT doc_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: doc_document_links doc_document_links_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_document_links
    ADD CONSTRAINT doc_document_links_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: doc_documents doc_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_documents
    ADD CONSTRAINT doc_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: doc_templates doc_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doc_templates
    ADD CONSTRAINT doc_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_compliance_status elv_compliance_status_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_compliance_status
    ADD CONSTRAINT elv_compliance_status_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_delegation_history elv_delegation_history_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_delegation_history
    ADD CONSTRAINT elv_delegation_history_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_delegation_history elv_delegation_history_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_delegation_history
    ADD CONSTRAINT elv_delegation_history_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_delegation_history elv_delegation_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_delegation_history
    ADD CONSTRAINT elv_delegation_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_elevators elv_elevators_administrative_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_administrative_unit_id_fkey FOREIGN KEY (administrative_unit_id) REFERENCES public.geo_administrative_units(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_elevators elv_elevators_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_elevators elv_elevators_building_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.geo_buildings(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_elevators elv_elevators_certifier_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_certifier_org_id_fkey FOREIGN KEY (certifier_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_elevators elv_elevators_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_elevators elv_elevators_installer_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_installer_org_id_fkey FOREIGN KEY (installer_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_elevators elv_elevators_maintenance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_maintenance_org_id_fkey FOREIGN KEY (maintenance_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_elevators elv_elevators_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_elevators elv_elevators_owner_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_elevators
    ADD CONSTRAINT elv_elevators_owner_org_id_fkey FOREIGN KEY (owner_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_ownership_history elv_ownership_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_ownership_history elv_ownership_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_ownership_history elv_ownership_history_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_ownership_history elv_ownership_history_new_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_new_owner_id_fkey FOREIGN KEY (new_owner_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_ownership_history elv_ownership_history_old_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_ownership_history
    ADD CONSTRAINT elv_ownership_history_old_owner_id_fkey FOREIGN KEY (old_owner_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_responsible_entities elv_responsible_entities_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_responsible_entities
    ADD CONSTRAINT elv_responsible_entities_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_responsible_entities elv_responsible_entities_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_responsible_entities
    ADD CONSTRAINT elv_responsible_entities_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_responsible_entities elv_responsible_entities_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_responsible_entities
    ADD CONSTRAINT elv_responsible_entities_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_status_history elv_status_history_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_status_history
    ADD CONSTRAINT elv_status_history_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_status_history elv_status_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_status_history
    ADD CONSTRAINT elv_status_history_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_status_history elv_status_history_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_status_history
    ADD CONSTRAINT elv_status_history_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_technical_data elv_technical_data_current_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data
    ADD CONSTRAINT elv_technical_data_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.elv_technical_data_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_technical_data elv_technical_data_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data
    ADD CONSTRAINT elv_technical_data_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: elv_technical_data_versions elv_technical_data_versions_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data_versions
    ADD CONSTRAINT elv_technical_data_versions_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: elv_technical_data_versions elv_technical_data_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data_versions
    ADD CONSTRAINT elv_technical_data_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: elv_technical_data_versions elv_technical_data_versions_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.elv_technical_data_versions
    ADD CONSTRAINT elv_technical_data_versions_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: geo_administrative_units geo_administrative_units_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_administrative_units
    ADD CONSTRAINT geo_administrative_units_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: geo_buildings geo_buildings_administrative_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_buildings
    ADD CONSTRAINT geo_buildings_administrative_unit_id_fkey FOREIGN KEY (administrative_unit_id) REFERENCES public.geo_administrative_units(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: geo_buildings geo_buildings_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_buildings
    ADD CONSTRAINT geo_buildings_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: geo_buildings geo_buildings_primary_owner_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_buildings
    ADD CONSTRAINT geo_buildings_primary_owner_org_id_fkey FOREIGN KEY (primary_owner_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: geo_municipalities geo_municipalities_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_municipalities
    ADD CONSTRAINT geo_municipalities_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.geo_regions(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_assigned_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_assigned_to_id_fkey FOREIGN KEY (assigned_to_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: incidents incidents_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: incidents incidents_reported_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_reported_by_id_fkey FOREIGN KEY (reported_by_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: insp_field_assignments insp_field_assignments_assigned_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_field_assignments
    ADD CONSTRAINT insp_field_assignments_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insp_field_assignments insp_field_assignments_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_field_assignments
    ADD CONSTRAINT insp_field_assignments_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insp_field_assignments insp_field_assignments_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_field_assignments
    ADD CONSTRAINT insp_field_assignments_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insp_field_assignments insp_field_assignments_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_field_assignments
    ADD CONSTRAINT insp_field_assignments_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.insp_inspections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: insp_inspections insp_inspections_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_inspections
    ADD CONSTRAINT insp_inspections_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.cert_certificates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: insp_inspections insp_inspections_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_inspections
    ADD CONSTRAINT insp_inspections_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insp_inspections insp_inspections_inspector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_inspections
    ADD CONSTRAINT insp_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insp_inspections insp_inspections_report_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insp_inspections
    ADD CONSTRAINT insp_inspections_report_document_id_fkey FOREIGN KEY (report_document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maint_compliance_status maint_compliance_status_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_compliance_status
    ADD CONSTRAINT maint_compliance_status_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maint_contracts maint_contracts_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_contracts
    ADD CONSTRAINT maint_contracts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.app_applications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maint_contracts maint_contracts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_contracts
    ADD CONSTRAINT maint_contracts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maint_contracts maint_contracts_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_contracts
    ADD CONSTRAINT maint_contracts_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maint_contracts maint_contracts_maintenance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_contracts
    ADD CONSTRAINT maint_contracts_maintenance_org_id_fkey FOREIGN KEY (maintenance_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maint_records maint_records_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_records
    ADD CONSTRAINT maint_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maint_records maint_records_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_records
    ADD CONSTRAINT maint_records_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: maint_records maint_records_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_records
    ADD CONSTRAINT maint_records_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: maint_records maint_records_maintenance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maint_records
    ADD CONSTRAINT maint_records_maintenance_org_id_fkey FOREIGN KEY (maintenance_org_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_invitations org_invitations_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_invitations
    ADD CONSTRAINT org_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: org_invitations org_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_invitations
    ADD CONSTRAINT org_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_invitations org_invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_invitations
    ADD CONSTRAINT org_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_invitations org_invitations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_invitations
    ADD CONSTRAINT org_invitations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.auth_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_licenses org_licenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_licenses
    ADD CONSTRAINT org_licenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: org_licenses org_licenses_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_licenses
    ADD CONSTRAINT org_licenses_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: org_licenses org_licenses_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_licenses
    ADD CONSTRAINT org_licenses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_memberships org_memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_memberships
    ADD CONSTRAINT org_memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_memberships org_memberships_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_memberships
    ADD CONSTRAINT org_memberships_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.auth_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_memberships org_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_memberships
    ADD CONSTRAINT org_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_organizations org_organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_organizations
    ADD CONSTRAINT org_organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: org_organizations org_organizations_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_organizations
    ADD CONSTRAINT org_organizations_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: org_qkb_validations org_qkb_validations_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_qkb_validations
    ADD CONSTRAINT org_qkb_validations_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: org_qkb_validations org_qkb_validations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_qkb_validations
    ADD CONSTRAINT org_qkb_validations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.org_organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: qr_codes qr_codes_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: qr_codes qr_codes_image_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_image_document_id_fkey FOREIGN KEY (image_document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_codes qr_codes_placement_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_placement_confirmed_by_fkey FOREIGN KEY (placement_confirmed_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_codes qr_codes_placement_photo_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_placement_photo_document_id_fkey FOREIGN KEY (placement_photo_document_id) REFERENCES public.doc_documents(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: qr_scan_logs qr_scan_logs_qr_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_scan_logs
    ADD CONSTRAINT qr_scan_logs_qr_code_id_fkey FOREIGN KEY (qr_code_id) REFERENCES public.qr_codes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_config sys_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_config
    ADD CONSTRAINT sys_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sys_legacy_registry_sequences sys_legacy_registry_sequences_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_legacy_registry_sequences
    ADD CONSTRAINT sys_legacy_registry_sequences_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_notification_preferences sys_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_notification_preferences
    ADD CONSTRAINT sys_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_notifications sys_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_notifications
    ADD CONSTRAINT sys_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_registry_sequences sys_registry_sequences_municipality_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_registry_sequences
    ADD CONSTRAINT sys_registry_sequences_municipality_id_fkey FOREIGN KEY (municipality_id) REFERENCES public.geo_municipalities(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sys_scheduled_reminders sys_scheduled_reminders_elevator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_scheduled_reminders
    ADD CONSTRAINT sys_scheduled_reminders_elevator_id_fkey FOREIGN KEY (elevator_id) REFERENCES public.elv_elevators(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sys_scheduled_reminders sys_scheduled_reminders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sys_scheduled_reminders
    ADD CONSTRAINT sys_scheduled_reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict OqwUTcJ1pRV5HXoGaq76RmSOoJIhLmn55vkvwffap1cF5ez1Inm02EN8E5spMiU

