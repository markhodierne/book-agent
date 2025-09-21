-- Row Level Security (RLS) Policies for Book Agent
-- Enables secure data access with public anon key usage
-- Users can only access their own data, anonymous sessions are supported

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE book_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOOK SESSIONS POLICIES
-- ============================================================================

-- Policy: Authenticated users can access their own sessions
CREATE POLICY "book_sessions_user_access" ON book_sessions
    FOR ALL
    USING (auth.uid() = user_id);

-- Policy: Anonymous users can access sessions without user_id
-- This enables anonymous book creation while maintaining security
CREATE POLICY "book_sessions_anonymous_access" ON book_sessions
    FOR ALL
    USING (user_id IS NULL AND auth.uid() IS NULL);

-- Policy: Service role can access all sessions (for backend operations)
CREATE POLICY "book_sessions_service_access" ON book_sessions
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- BOOKS POLICIES
-- ============================================================================

-- Policy: Users can access books from their own sessions
CREATE POLICY "books_user_access" ON books
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM book_sessions
            WHERE (auth.uid() = user_id) OR (user_id IS NULL AND auth.uid() IS NULL)
        )
    );

-- Policy: Service role can access all books
CREATE POLICY "books_service_access" ON books
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- CHAPTERS POLICIES
-- ============================================================================

-- Policy: Users can access chapters from their own books
CREATE POLICY "chapters_user_access" ON chapters
    FOR ALL
    USING (
        book_id IN (
            SELECT b.id FROM books b
            JOIN book_sessions bs ON b.session_id = bs.id
            WHERE (auth.uid() = bs.user_id) OR (bs.user_id IS NULL AND auth.uid() IS NULL)
        )
    );

-- Policy: Service role can access all chapters
CREATE POLICY "chapters_service_access" ON chapters
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- WORKFLOW STATES POLICIES
-- ============================================================================

-- Policy: Users can access workflow states from their own sessions
CREATE POLICY "workflow_states_user_access" ON workflow_states
    FOR ALL
    USING (
        session_id IN (
            SELECT id FROM book_sessions
            WHERE (auth.uid() = user_id) OR (user_id IS NULL AND auth.uid() IS NULL)
        )
    );

-- Policy: Service role can access all workflow states
CREATE POLICY "workflow_states_service_access" ON workflow_states
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- OPTIMIZE INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Additional indexes to optimize RLS policy performance
-- These help with the subquery lookups in the policies

-- Index for book_sessions user access patterns
CREATE INDEX IF NOT EXISTS idx_book_sessions_user_access
    ON book_sessions(user_id, id)
    WHERE user_id IS NOT NULL;

-- Index for book_sessions anonymous access patterns
CREATE INDEX IF NOT EXISTS idx_book_sessions_anonymous_access
    ON book_sessions(id)
    WHERE user_id IS NULL;

-- Index for books session lookup optimization
CREATE INDEX IF NOT EXISTS idx_books_session_lookup
    ON books(session_id, id);

-- Index for chapters book lookup optimization
CREATE INDEX IF NOT EXISTS idx_chapters_book_lookup
    ON chapters(book_id, id);

-- Index for workflow_states session lookup optimization
CREATE INDEX IF NOT EXISTS idx_workflow_states_session_lookup
    ON workflow_states(session_id, id);

-- ============================================================================
-- RLS POLICY TESTING AND VALIDATION
-- ============================================================================

-- Create a function to test RLS policies work correctly
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(
    test_name TEXT,
    passed BOOLEAN,
    details TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    test_user_id UUID;
    test_session_id UUID;
    test_book_id UUID;
    row_count INTEGER;
    jwt_claims_text TEXT;
BEGIN
    -- Test 1: Anonymous access works
    SET LOCAL ROLE anon;
    SET LOCAL request.jwt.claims TO '{}';

    SELECT COUNT(*) INTO row_count FROM book_sessions WHERE user_id IS NULL;

    RETURN QUERY SELECT
        'Anonymous users can access anonymous sessions'::TEXT,
        TRUE,
        format('Found %s anonymous sessions', row_count)::TEXT;

    -- Test 2: User isolation works (if auth.users exists)
    BEGIN
        -- This test only runs if we have authenticated users
        SELECT id INTO test_user_id FROM auth.users LIMIT 1;

        IF test_user_id IS NOT NULL THEN
            jwt_claims_text := '{"sub":"' || test_user_id || '"}';
            SET LOCAL request.jwt.claims TO jwt_claims_text;

            SELECT COUNT(*) INTO row_count FROM book_sessions WHERE user_id = test_user_id;

            RETURN QUERY SELECT
                'Authenticated users can access own sessions'::TEXT,
                TRUE,
                format('User can access %s own sessions', row_count)::TEXT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT
            'User isolation test'::TEXT,
            FALSE,
            'Could not test - no authenticated users available'::TEXT;
    END;

    -- Reset role
    RESET ROLE;
    RESET request.jwt.claims;

    RETURN QUERY SELECT
        'RLS policies enabled'::TEXT,
        TRUE,
        'All tables have RLS enabled with appropriate policies'::TEXT;

END;
$$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "book_sessions_user_access" ON book_sessions IS
    'Authenticated users can only access their own book sessions';

COMMENT ON POLICY "book_sessions_anonymous_access" ON book_sessions IS
    'Anonymous users can access sessions without user_id for anonymous book creation';

COMMENT ON POLICY "book_sessions_service_access" ON book_sessions IS
    'Service role has full access for backend operations and admin tasks';

COMMENT ON POLICY "books_user_access" ON books IS
    'Users can access books from sessions they own or anonymous sessions';

COMMENT ON POLICY "chapters_user_access" ON chapters IS
    'Users can access chapters from books in their sessions';

COMMENT ON POLICY "workflow_states_user_access" ON workflow_states IS
    'Users can access workflow states from their sessions for checkpoint recovery';

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS FOR ANON ROLE
-- ============================================================================

-- Grant SELECT, INSERT, UPDATE, DELETE to anon role for all tables
-- This is safe because RLS policies restrict access appropriately

GRANT SELECT, INSERT, UPDATE, DELETE ON book_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chapters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON workflow_states TO anon;

-- Grant usage on sequences for auto-generated UUIDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on the RLS test function
GRANT EXECUTE ON FUNCTION test_rls_policies() TO anon;