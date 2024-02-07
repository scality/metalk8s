import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useHistory } from 'react-router';
import Joi from '@hapi/joi';
import { joiResolver } from '@hookform/resolvers/joi';
import { useTheme } from 'styled-components';
import {
  AppContainer,
  Banner,
  Checkbox,
  Form,
  FormGroup,
  FormSection,
  FormattedDateTime,
  Icon,
  Loader,
  Stack,
  Text,
  TextArea,
} from '@scality/core-ui';
import { Box, Button, Input, Select } from '@scality/core-ui/dist/next';
import { useDispatch } from 'react-redux';

import {
  AlertConfiguration,
  AlertStoreLogLine,
  PromiseResult,
  useAlertConfiguration,
  useEditAlertConfiguration,
  useTestAlertConfiguration,
} from './domain/AlertConfigurationDomain';
import { Metalk8sCSCAlertConfigurationStore } from './infrastructure/Metalk8sCSCAlertConfigurationStore';
import { useAuth } from '../containers/PrivateRoute';
import { useConfig } from '../FederableApp';
import { addNotificationSuccessAction } from '../ducks/app/notifications';

const LogsBanner = ({ logs }: { logs: PromiseResult<AlertStoreLogLine[]> }) => {
  const firstLog =
    logs.status === 'success' && logs.value.length > 0 ? logs.value[0] : null;

  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (bannerRef.current) {
      bannerRef.current.focus();
    }
  }, [bannerRef.current]);

  if (firstLog?.level !== 'ERROR') {
    return <></>;
  }

  return (
    <div ref={bannerRef} tabIndex={0}>
      <Banner
        variant="warning"
        icon={<Icon name="Exclamation-circle" color="statusWarning" />}
      >
        {`Error: ${firstLog.message} `}
        <FormattedDateTime format="relative" value={firstLog.occuredOn} />
      </Banner>
    </div>
  );
};

const emailRegex =
  // eslint-disable-next-line no-useless-escape
  /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/i;
const rfc5322EmailAddressRegex =
  // eslint-disable-next-line no-useless-escape
  /^((([^ ]+ )+<[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*>|[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*|<[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*>)(, ?)?)+$/i;

const schema = Joi.object({
  enabled: Joi.boolean()
    .required()
    .label('Enable Email Notification Configuration'),
  host: Joi.string().required().label('SMTP Host'),
  port: Joi.number().required().min(1).label('SMTP Port'),
  isTLSEnabled: Joi.boolean().required().label('Enable SMTP Over TLS'),
  type: Joi.string().required().label('SMTP Auth'),

  username: Joi.when('type', {
    is: Joi.equal('CRAM-MD5', 'PLAIN', 'LOGIN'),
    then: Joi.string().required().label('Username'),
    otherwise: Joi.valid(),
  }),
  secret: Joi.when('type', {
    is: Joi.equal('CRAM-MD5'),
    then: Joi.string().required().label('Secret'),
    otherwise: Joi.valid(),
  }),
  identity: Joi.when('type', {
    is: Joi.equal('PLAIN'),
    then: Joi.string().required().label('Identity'),
    otherwise: Joi.valid(),
  }),
  password: Joi.when('type', {
    is: Joi.equal('PLAIN', 'LOGIN'),
    then: Joi.string().required().label('Password'),
    otherwise: Joi.valid(),
  }),
  from: Joi.string()
    .required()
    .label('Sender Email Address')
    .regex(emailRegex)
    .message('The email address is invalid'),
  to: Joi.string()
    .required()
    .label('Recipient Email Addresses')
    .regex(rfc5322EmailAddressRegex)
    .message('The email addresses are invalid'),
  sendResolved: Joi.boolean()
    .required()
    .label('Enable Receive Resolved Alerts'),
});

export default function ConfigureAlerting() {
  const theme = useTheme();
  const history = useHistory();
  const dispatch = useDispatch();
  const {
    register,
    reset,
    handleSubmit,
    control,
    watch,
    getValues,
    formState,
  } = useForm<AlertConfiguration>({
    mode: 'onChange',
    resolver: joiResolver(schema),
  });
  const credsType = watch('type');

  const {
    url: kubernetesApiUrl,
    url_salt: saltApiUrl,
    url_alertmanager: alertManagerUrl,
  } = useConfig();

  const { userData } = useAuth();
  const token = userData?.token || '';
  const email = userData?.email || '';

  const alertConfigurationStore = new Metalk8sCSCAlertConfigurationStore(
    kubernetesApiUrl,
    saltApiUrl,
    alertManagerUrl,
    token,
    email,
  );

  const { alertConfiguration, logs: alertLogs } = useAlertConfiguration({
    alertConfigurationStore,
  });

  const { editAlertMutation } = useEditAlertConfiguration({
    alertConfigurationStore,
  });

  useEffect(() => {
    if (editAlertMutation.status === 'success') {
      dispatch(
        addNotificationSuccessAction({
          title: 'Email notification configuration',
          message: 'The email notification configuration has been saved',
        }),
      );
      history.push('/alerts');
    }
  }, [editAlertMutation.status]);

  useEffect(() => {
    if (alertConfiguration.status === 'success') {
      reset(alertConfiguration.value);
    }
  }, [alertConfiguration.status]);

  const { sendTestAlertMutation, logs: testAlertlogs } =
    useTestAlertConfiguration({
      alertConfigurationStore,
    });

  useEffect(() => {
    if (sendTestAlertMutation.status === 'success') {
      dispatch(
        addNotificationSuccessAction({
          title: 'Email notification configuration',
          message: 'The email has been sent, please check your email',
        }),
      );
    }
  }, [sendTestAlertMutation.status]);

  const labelWidth = 270;

  const disableFormButton =
    editAlertMutation.isLoading ||
    sendTestAlertMutation.isLoading ||
    !formState.isDirty;

  if (alertConfiguration.status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <AppContainer hasPadding>
      <AppContainer.MainContent background="backgroundLevel1">
        {/* @ts-expect-error - FIXME when you are working on it */}
        <Box margin="0 auto" background={theme.backgroundLevel4} flex="1">
          <Form
            onSubmit={handleSubmit((data) => {
              editAlertMutation.mutate(data);
            })}
            layout={{ kind: 'page', title: 'Email notification configuration' }}
            rightActions={
              <Stack gap="r16">
                <Button
                  onClick={() => {
                    history.push('/alerts');
                  }}
                  variant="outline"
                  label="Cancel"
                  type="button"
                />
                <Button
                  type="button"
                  variant="secondary"
                  tooltip={
                    Object.entries(formState.dirtyFields).filter(
                      ([key]) => key !== 'enabled',
                    ).length > 0
                      ? {
                          overlay:
                            'Triggering a test mail will restart alerting service, alerts will be retriggered few minutes after.',
                        }
                      : undefined
                  }
                  disabled={
                    sendTestAlertMutation.isLoading ||
                    editAlertMutation.isLoading
                  }
                  label={
                    sendTestAlertMutation.isLoading ? (
                      <Text
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                        }}
                      >
                        Sending... <Loader />
                      </Text>
                    ) : (
                      'Send a test email'
                    )
                  }
                  onClick={() => {
                    sendTestAlertMutation.mutate(getValues());
                  }}
                />
                <Button
                  variant="primary"
                  tooltip={
                    formState.isDirty
                      ? {
                          overlay:
                            'Saving the configuration will restart alerting service, alerts will be retriggered few minutes after.',
                        }
                      : undefined
                  }
                  label={
                    editAlertMutation.isLoading ? (
                      <Text
                        style={{
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                        }}
                      >
                        Saving... <Loader />
                      </Text>
                    ) : (
                      'Save'
                    )
                  }
                  disabled={disableFormButton}
                  type="submit"
                />
              </Stack>
            }
            banner={
              <>
                <LogsBanner logs={alertLogs} />
                {sendTestAlertMutation.status === 'success' && (
                  <LogsBanner logs={testAlertlogs} />
                )}
              </>
            }
          >
            <FormSection forceLabelWidth={labelWidth}>
              <FormGroup
                required
                id="enabled"
                error={formState.errors?.enabled?.message ?? ''}
                label="Enable Email Notification Configuration"
                helpErrorPosition="bottom"
                content={<Checkbox id="enabled" {...register('enabled')} />}
              />
            </FormSection>
            <FormSection
              forceLabelWidth={labelWidth}
              title={{ name: 'SMTP connection' }}
            >
              <FormGroup
                required
                id="host"
                label="SMTP Host"
                helpErrorPosition="bottom"
                error={formState.errors?.host?.message ?? ''}
                content={
                  <Input
                    id="host"
                    placeholder="my-smtp.domain.local"
                    {...register('host')}
                  />
                }
              />
              <FormGroup
                required
                id="port"
                label="SMTP Port"
                helpErrorPosition="bottom"
                error={formState.errors?.port?.message ?? ''}
                content={
                  <Input
                    type="number"
                    id="port"
                    placeholder="25"
                    {...register('port')}
                  />
                }
              />
              <FormGroup
                id="isTLSEnabled"
                label="Enable SMTP Over TLS"
                helpErrorPosition="bottom"
                error={formState.errors?.isTLSEnabled?.message ?? ''}
                help="If enabled, SMTP will be used over TLS (STARTTLS)"
                content={
                  <Checkbox id="isTLSEnabled" {...register('isTLSEnabled')} />
                }
              />
            </FormSection>
            <FormSection
              forceLabelWidth={labelWidth}
              title={{ name: 'Authentication' }}
            >
              <FormGroup
                required
                id="type"
                label="SMTP Auth"
                helpErrorPosition="bottom"
                error={formState.errors?.type?.message ?? ''}
                content={
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => {
                      return (
                        <Select
                          id="type"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          onBlur={field.onBlur}
                        >
                          <Select.Option value="NO_AUTHENTICATION">
                            NO AUTHENTICATION
                          </Select.Option>
                          <Select.Option value="LOGIN">LOGIN</Select.Option>
                          <Select.Option value="CRAM-MD5">
                            CRAM-MD5
                          </Select.Option>
                          <Select.Option value="PLAIN">PLAIN</Select.Option>
                        </Select>
                      );
                    }}
                  />
                }
              />
              {credsType === 'CRAM-MD5' ? (
                <>
                  <FormGroup
                    required
                    id="username"
                    label="Username"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.username?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        id="username"
                        placeholder="username"
                        {...register('username')}
                      />
                    }
                  />
                  <FormGroup
                    required
                    id="secret"
                    label="Secret"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.secret?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        id="secret"
                        type="password"
                        placeholder="secret"
                        {...register('secret')}
                      />
                    }
                  />
                </>
              ) : (
                <></>
              )}

              {credsType === 'PLAIN' ? (
                <>
                  <FormGroup
                    required
                    id="identity"
                    label="Identity"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.identity?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        id="identity"
                        placeholder="identity"
                        {...register('identity')}
                      />
                    }
                  />
                  <FormGroup
                    required
                    id="username"
                    label="Username"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.username?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        id="username"
                        placeholder="username"
                        {...register('username')}
                      />
                    }
                  />
                  <FormGroup
                    required
                    id="password"
                    label="Password"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.password?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        type="password"
                        id="password"
                        placeholder="password"
                        {...register('password')}
                      />
                    }
                  />
                </>
              ) : (
                <></>
              )}

              {credsType === 'LOGIN' ? (
                <>
                  <FormGroup
                    required
                    id="username"
                    label="Username"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.username?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        id="username"
                        placeholder="username"
                        {...register('username')}
                      />
                    }
                  />
                  <FormGroup
                    required
                    id="password"
                    label="Password"
                    // @ts-expect-error - FIXME when you are working on it
                    error={formState.errors?.password?.message ?? ''}
                    helpErrorPosition="bottom"
                    content={
                      <Input
                        type="password"
                        id="password"
                        placeholder="password"
                        {...register('password')}
                      />
                    }
                  />
                </>
              ) : (
                <></>
              )}
            </FormSection>
            <FormSection
              forceLabelWidth={labelWidth}
              title={{ name: 'Email configuration' }}
            >
              <FormGroup
                required
                id="from"
                label="Sender Email Address"
                error={formState.errors?.from?.message ?? ''}
                helpErrorPosition="bottom"
                content={
                  <Input
                    id="from"
                    placeholder="no-reply@domain.local"
                    {...register('from')}
                  />
                }
              />
              <FormGroup
                id="to"
                required
                label="Recipient Email Addresses"
                help="To add multiple recipients, use comma to separate addresses"
                helpErrorPosition="bottom"
                error={formState.errors?.to?.message ?? ''}
                content={
                  <TextArea
                    width="270px"
                    height="200px"
                    variant="text"
                    id="to"
                    placeholder="me@domain.local"
                    {...register('to')}
                  />
                }
              />
              <FormGroup
                id="sendResolved"
                label="Enable Receive Resolved Alerts"
                helpErrorPosition="bottom"
                error={formState.errors?.sendResolved?.message ?? ''}
                help="If enabled, resolved alerts will be sent to the recipients"
                content={
                  <Checkbox id="sendResolved" {...register('sendResolved')} />
                }
              />
            </FormSection>
          </Form>
        </Box>
      </AppContainer.MainContent>
    </AppContainer>
  );
}
